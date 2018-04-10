// @flow

import { omit } from 'lodash';
import { EDIT, SET_SELECTION } from './actions';
import { getParameters, isPreview } from '../parameters';

const PREVIEW = {
  ko: [
    {
      id: 3,
      text: '일본',
      alias: 'location',
      meta: '@sys.location',
    },
    {
      text: '의 관광지를 볼 수 있습니까?',
    },
  ],
  ru: [
    { text: 'я могу увидеть туристические места в ' },
    {
      id: 3,
      text: 'Японии',
      alias: 'location',
      meta: '@sys.location',
    },
  ],
  fr: [
    { text: 'puis-je voir les lieux touristiques au ' },
    {
      id: 3,
      text: 'Japon',
      alias: 'location',
      meta: '@sys.location',
    },
  ],
  it: [
    { text: 'posso vedere i posti turistici in ' },
    {
      id: 3,
      text: 'Giappone',
      alias: 'location',
      meta: '@sys.location',
    },
  ],
  es: [
    { text: 'puedo ver los lugares turísticos en ' },
    {
      id: 3,
      text: 'Japón',
      alias: 'location',
      meta: '@sys.location',
    },
  ],
  pt: [
    { text: 'posso ver os lugares turísticos no ' },
    {
      id: 3,
      text: 'Japão',
      alias: 'location',
      meta: '@sys.location',
    },
  ],
};

const INITIAL_STATE = {
  filename: 'testData.json',
  originalSource: null,
  examples: null,
  isUnsaved: false,
  selection: null,
  idExampleInModal: null,
  todos: [],
  translation: {
    data: isPreview() ? PREVIEW[getParameters().language] : [],
  },
};

function mergeNonEntities(oldEntities) {
  const entities = [];
  oldEntities.forEach(oldEntity => {
    const lastEntity = entities[entities.length - 1];
    if (lastEntity && !lastEntity.id && !oldEntity.id) {
      lastEntity.text += oldEntity.text;
    } else {
      entities.push(oldEntity);
    }
  });
  return entities;
}

function removeUnknownEntity(oldEntities) {
  return mergeNonEntities(
    oldEntities.map(e => (e.id === -1 ? omit(e, 'id') : e))
  );
}

function setSelection(oldTranslation, start, end) {
  const { data: oldEntities } = oldTranslation;
  const entities = [];
  removeUnknownEntity(oldEntities).forEach(oldEntity => {
    const pos = entities.map(e => e.text.length).reduce((a, b) => a + b, 0);
    if (pos <= start && end <= pos + oldEntity.text.length && !oldEntity.id) {
      // Split text
      if (pos < start) {
        entities.push({
          ...oldEntity,
          text: oldEntity.text.substr(0, start - pos),
        });
      }

      entities.push({
        ...oldEntity,
        text: oldEntity.text.substr(start - pos, end - start),
        id: -1,
      });

      if (end < pos + oldEntity.text.length) {
        entities.push({
          ...oldEntity,
          text: oldEntity.text.substr(end - pos),
        });
      }
    } else {
      entities.push(oldEntity);
    }
  });
  return { ...oldTranslation, data: entities };
}

export default function reducers(
  state: Object = INITIAL_STATE,
  action: Object
) {
  const { type, payload } = action;

  switch (type) {
    case EDIT: {
      const { data } = payload;
      return {
        ...state,
        translation: {
          data: mergeNonEntities(data),
        },
      };
    }
    case SET_SELECTION: {
      const { start, end } = payload;
      if (start === end) {
        return state;
      }
      return {
        ...state,
        translation: setSelection(state.translation, start, end),
      };
    }
    default:
      return state;
  }
}
