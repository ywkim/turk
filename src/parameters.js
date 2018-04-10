import queryString from './query-string';

export function getParameters() {
  return queryString.parse(window.location.search);
}

export function isPreview() {
  return getParameters().assignmentId === 'ASSIGNMENT_ID_NOT_AVAILABLE';
}
