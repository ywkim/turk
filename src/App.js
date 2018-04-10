// @flow

import React, { Component } from 'react';
import { findDOMNode } from 'react-dom';
import { connect } from 'react-redux';
import {
  Row,
  Col,
  Input,
  Table,
  Select,
  Icon,
  Alert,
  Button,
  Card,
  message,
} from 'antd';
import { omit } from 'lodash';
import './App.css';
import getColor from './getColor';
import * as actions from './state/actions';
import { getParameters, isPreview } from './parameters';
import SourceEntityTable from './SourceEntityTable';

const LANGUAGES = {
  ko: 'Korean',
  ru: 'Russian',
  fr: 'French',
  it: 'Italian',
  es: 'Spanish',
  pt: 'Portuguese',
};

const styles = {
  text: {},
  highlightText: {
    color: 'transparent',
    pointerEvents: 'none',
    padding: '5px 8px',
    whiteSpace: 'pre',
  },
  zeroPos: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  input: {
    background: 'none',
    border: 'none',
    width: '100%',
  },
};

const { Option } = Select;

function getUserSay() {
  if (isPreview()) {
    return {
      data: [
        {
          id: 1,
          text: 'can',
          meta: '@sys.ignore',
        },
        {
          id: 2,
          text: ' I see the tourist places in ',
        },
        {
          id: 3,
          text: 'Japan',
          alias: 'location',
          meta: '@sys.location',
        },
      ],
    };
  }
  return {
    data: JSON.parse(getParameters().userSay).data.map((e, i) => ({
      ...e,
      id: i + 1,
    })),
  };
}

function findEntityById(id) {
  return getUserSay().data.find(e => e.id === id);
}

const mapState = state => {
  const { translation } = state;
  return {
    translation,
  };
};

const mapActions = dispatch => ({
  edit: data => {
    dispatch(actions.edit(data));
  },
  setSelection: (start, end) => {
    dispatch(actions.setSelection(start, end));
  },
});

class App extends Component {
  selectionAnchorNode: Node;
  inputNode: HTMLInputElement;

  componentDidMount() {
    document.addEventListener(
      'selectionchange',
      () => {
        const { setSelection } = this.props;
        const selection = window.getSelection();

        if (
          selection.anchorNode &&
          selection.anchorNode === this.selectionAnchorNode
        ) {
          setSelection(
            this.inputNode.selectionStart,
            this.inputNode.selectionEnd
          );
        }
      },
      false
    );
  }

  handleTextChange = e => {
    const { edit } = this.props;

    const text = e.target.value;

    // TODO update the entity boudaries

    edit([
      {
        text,
      },
    ]);
  };

  handleEntityChange(entityIndex, value) {
    const { translation, edit } = this.props;
    edit(
      translation.data.map(
        (e, i) => (i === entityIndex ? { ...e, id: value } : e)
      )
    );
  }

  deleteEntity(entityIndex) {
    const { translation, edit } = this.props;
    edit(
      translation.data.map((e, i) => (i === entityIndex ? omit(e, 'id') : e))
    );
  }

  handleCopy = e => {
    message.error('Copy is disabled');
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
  };

  handlePaste = e => {
    message.error('Paste is disabled');
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
  };

  isValid() {
    // Check unknown entity
    const { translation } = this.props;
    const unknown = translation.data.find(e => e.id === -1);
    if (unknown) {
      return false;
    }
    // Check whether all entities are present
    return getUserSay()
      .data.filter(e => e.alias)
      .every(
        entity =>
          translation.data.filter(item => item.id === entity.id).length === 1
      );
  }

  errorMessages() {
    const { translation } = this.props;
    const messages = [];
    // Check whether all entities are present
    getUserSay()
      .data.filter(e => e.alias)
      .forEach(entity => {
        if (
          translation.data.filter(item => item.id === entity.id).length === 0
        ) {
          messages.push(
            `${entity.alias} ("${entity.text}") is not selected. 😞`
          );
        }
      });
    // Check duplicated entities
    getUserSay()
      .data.filter(e => e.alias)
      .forEach(entity => {
        if (translation.data.filter(item => item.id === entity.id).length > 1) {
          messages.push(
            `There are multiple ${entity.alias} ("${entity.text}"). 😲`
          );
        }
      });
    if (messages.length) {
      return messages;
    }
    // Check unknown entity
    const unknown = translation.data.find(e => e.id === -1);
    if (unknown) {
      return [`Entity for "${unknown.text}" is not selected. 🤔`];
    }
    return ['No error'];
  }

  makeAnswer() {
    const { translation } = this.props;

    return JSON.stringify({
      count: 0,
      ...translation,
      data: translation.data.map(e => {
        if (e.id) {
          return omit(
            {
              ...findEntityById(e.id),
              userDefined: true,
              ...e,
            },
            'id'
          );
        }
        return { userDefined: false, ...e };
      }),
    });
  }

  handleSubmit = () => {
    const url = `${getParameters().turkSubmitTo}/mturk/externalSubmit`;
    const formData = new FormData();
    formData.append('assignmentId', getParameters().assignmentId);
    formData.append('translation', this.makeAnswer());
    const request = { method: 'POST', body: formData };
    fetch(url, request);
  };

  render() {
    const columns = [
      {
        title: 'Entity',
        dataIndex: 'entity',
        key: 'entity',
        render: (_, entity) => (
          <Select
            defaultValue={entity.id > 0 ? `${entity.id}` : undefined}
            style={{ width: 160 }}
            onChange={value =>
              this.handleEntityChange(entity.index, parseInt(value, 10))
            }
          >
            {getUserSay()
              .data.filter(e => e.alias)
              .map(e => (
                <Option key={`${e.id}`}>{`${e.alias} ("${e.text}")`}</Option>
              ))}
          </Select>
        ),
      },
      {
        title: 'Selection',
        key: 'selection',
        render: (_, entity) => <span>{entity.text}</span>,
      },
      {
        title: '',
        key: 'actions',
        render: (_, entity) => (
          <span>
            <Icon
              type="delete"
              onClick={() => {
                this.deleteEntity(entity.index);
              }}
            />
          </span>
        ),
      },
    ];

    return (
      <div>
        <Row>
          <Col
            xs={{ span: 24, offset: 0 }}
            lg={{ span: 8, offset: 8 }}
            type="flex"
            align="middle"
          >
            <Card title="English" style={{ marginTop: 2, marginBottom: 5 }}>
              <h1 onCopy={this.handleCopy} style={{ marginBottom: 5 }}>
                {getUserSay().data.map(e => (
                  <span key={e.id} style={e.alias && { ...getColor(e.id) }}>
                    {e.text}
                  </span>
                ))}
              </h1>
              <div style={{ marginBottom: 5 }}>
                <SourceEntityTable
                  entities={getUserSay().data.filter(e => e.alias)}
                />
              </div>
            </Card>

            <Icon type="caret-down" style={{ marginBottom: 5, fontSize: 32 }} />

            <Card
              title={LANGUAGES[getParameters().language]}
              style={{ marginBottom: 5 }}
            >
              <div style={{ width: '100%', marginBottom: 5 }}>
                <div
                  style={{ position: 'relative' }}
                  ref={node => {
                    this.selectionAnchorNode = node;
                  }}
                >
                  <Input
                    ref={node => {
                      // eslint-disable-next-line react/no-find-dom-node
                      this.inputNode = node && findDOMNode(node);
                    }}
                    onPaste={this.handlePaste}
                    onChange={this.handleTextChange}
                    value={this.props.translation.data
                      .map(item => item.text)
                      .join('')}
                    placeholder="translation"
                  />
                  <div style={{ ...styles.zeroPos, ...styles.highlightText }}>
                    {this.props.translation.data.map((e, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <span key={i} style={e.id && { ...getColor(e.id) }}>
                        {e.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 5 }}>
                <Table
                  style={{ marginBottom: 8 }}
                  size="small"
                  pagination={false}
                  columns={columns}
                  dataSource={this.props.translation.data
                    .map((e, index) => ({
                      ...e,
                      index,
                      key: `${index}: ${e.text}`,
                    }))
                    .filter(e => e.id)}
                  rowKey="key"
                />
              </div>
            </Card>
            {!this.isValid() && (
              <div style={{ marginBottom: 5 }}>
                {this.errorMessages().map(m => (
                  <Alert key={m} message={m} type="error" />
                ))}
              </div>
            )}
            <p>
              <Button
                type="primary"
                id="submitButton"
                disabled={isPreview() || !this.isValid()}
                onClick={this.handleSubmit}
              >
                {isPreview()
                  ? 'You must ACCEPT the HIT before you can submit the results.'
                  : 'Submit'}
              </Button>
            </p>
          </Col>
        </Row>
      </div>
    );
  }
}

export default connect(mapState, mapActions)(App);
