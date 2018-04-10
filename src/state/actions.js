// @flow

export const EDIT = 'EDIT';
export const edit = (data: Object): Object => ({
  type: EDIT,
  payload: { data },
});

export const SET_SELECTION = 'SET_SELECTION';
export const setSelection = (start: number, end: number): Object => ({
  type: SET_SELECTION,
  payload: { start, end },
});
