// @flow

import React, { Component } from 'react';
import { Table } from 'antd';
import getColor from './getColor';

export default class SourceEntityTable extends Component {
  render() {
    const { entities } = this.props;

    const columns = [
      {
        title: 'Entity',
        dataIndex: 'entity',
        key: 'entity',
        render: (_, entity) => (
          <span style={{ ...getColor(entity.id) }}>{entity.alias}</span>
        ),
      },
      {
        title: 'Text',
        key: 'text',
        render: (_, entity) => <span>{entity.text}</span>,
      },
    ];

    return (
      <Table
        style={{ marginBottom: 8 }}
        size="small"
        pagination={false}
        columns={columns}
        dataSource={entities.map((e, index) => ({ ...e, index }))}
        rowKey="index"
      />
    );
  }
}
