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
  Collapse,
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
  pt: 'Portuguese (Portugal)',
  de: 'German',
  'pt-br': 'Portuguese (Brazil)',
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
const { Panel } = Collapse;

function getUserSay() {
  return {
    data: (isPreview()
      ? [
          {
            text: 'can',
            meta: '@sys.ignore',
          },
          {
            text: ' I see the tourist places in ',
          },
          {
            text: 'Japan',
            alias: 'location',
            meta: '@sys.location',
          },
        ]
      : JSON.parse(getParameters().userSay).data
    ).map((e, i) => ({
      ...e,
      id: i + 1,
    })),
  };
}

function getSourceEntities() {
  return getUserSay().data.filter(e => e.alias);
}

function isAnnotationEnabled() {
  return getSourceEntities().length > 0;
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
  formNode: HTMLFormElement;

  componentDidMount() {
    document.addEventListener(
      'selectionchange',
      () => {
        const { setSelection } = this.props;
        const selection = window.getSelection();

        if (
          isAnnotationEnabled() &&
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
    this.inputNode.focus();
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
    const { translation } = this.props;
    // Check translation
    if (!translation.data.map(item => item.text).join('').length) {
      return false;
    }
    // Check unknown entity
    const unknown = translation.data.find(e => e.id === -1);
    if (unknown) {
      return false;
    }
    // Check whether all entities are present
    return getSourceEntities().every(
      entity =>
        translation.data.filter(item => item.id === entity.id).length === 1
    );
  }

  messages() {
    const { translation } = this.props;
    if (!this.isValid()) {
      // Check translation
      if (!translation.data.map(item => item.text).join('').length) {
        return [];
      }
      const messages = [];
      // Check whether all entities are present
      getSourceEntities().forEach(entity => {
        if (
          translation.data.filter(item => item.id === entity.id).length === 0
        ) {
          messages.push({
            type: 'info',
            text: `${entity.alias} ("${entity.text}") is not selected. 😞`,
          });
        }
      });
      // Check duplicated entities
      getSourceEntities().forEach(entity => {
        if (translation.data.filter(item => item.id === entity.id).length > 1) {
          messages.push({
            type: 'error',
            text: `There are multiple ${entity.alias} ("${entity.text}"). 😲`,
          });
        }
      });
      if (messages.length) {
        return messages;
      }
      // Check unknown entity
      const unknown = translation.data.find(e => e.id === -1);
      if (unknown) {
        return [{ type: 'error', text: `The entity is not selected. 🤔` }];
      }
      return [{ type: 'error', text: 'No error' }];
    }

    // Non-entity text are not provided
    if (
      translation.data
        .filter(item => !item.id)
        .map(item => item.text)
        .join('')
        .trim().length === 0
    ) {
      return [
        {
          type: 'warning',
          text:
            'Any abuse of the system, such as not providing a complete translation, may result to your HIT being rejected.',
        },
      ];
    }
    return [];
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
    this.formNode.submit();
  };

  handleFormSubmit = e => {
    if (isPreview() || !this.isValid()) {
      e.preventDefault();
    }
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
            {getSourceEntities().map(e => (
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
        <form
          name="mturk_form"
          method="post"
          id="mturk_form"
          action={`${getParameters().turkSubmitTo}/mturk/externalSubmit`}
          ref={node => {
            // eslint-disable-next-line react/no-find-dom-node
            this.formNode = node && findDOMNode(node);
          }}
          onSubmit={this.handleFormSubmit}
        >
          <input
            type="hidden"
            value={getParameters().assignmentId}
            name="assignmentId"
            id="assignmentId"
          />
          <input
            type="hidden"
            value={this.makeAnswer()}
            name="translation"
            id="translation"
          />
          <Row>
            <Col
              xs={{ span: 24, offset: 0 }}
              lg={{ span: 8, offset: 8 }}
              style={{ paddingTop: 2 }}
            >
              {isAnnotationEnabled() && (
                <Collapse style={{ marginBottom: 5 }}>
                  <Panel
                    header="Annotation Instructions (Click to expand)"
                    key="1"
                  >
                    <p>
                      <b>Annotation</b> is a process of linking a word (or
                      phrase) to an entity.
                    </p>
                    <p>
                      You have to annotate the translation by selecting a word
                      or phrase and choosing an entity.
                    </p>
                  </Panel>
                </Collapse>
              )}
              <Card title="English" style={{ marginBottom: 5 }}>
                <h1 onCopy={this.handleCopy} style={{ marginBottom: 5 }}>
                  {getUserSay().data.map(e => (
                    <span
                      key={e.id}
                      style={e.alias ? getColor(e.id) : undefined}
                    >
                      {e.text}
                    </span>
                  ))}
                </h1>
                {isAnnotationEnabled() && (
                  <div style={{ marginBottom: 5 }}>
                    <SourceEntityTable entities={getSourceEntities()} />
                  </div>
                )}
              </Card>

              <div style={{ marginBottom: 5, textAlign: 'center' }}>
                <Icon type="caret-down" style={{ fontSize: 32 }} />
              </div>

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
                {isAnnotationEnabled() && (
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
                )}
              </Card>
              {!this.isValid() &&
                this.messages().length > 0 && (
                  <div style={{ marginBottom: 5 }}>
                    {this.messages().map(m => (
                      <Alert key={m} message={m.text} type={m.type} showIcon />
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
        </form>
      </div>
    );
  }
}

export default connect(mapState, mapActions)(App);
