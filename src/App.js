import React, { Component } from 'react';
import queryString from './query-string';
import './App.css';

const languageName = {
  ko: 'Korean',
  ru: 'Russian',
  fr: 'French',
  it: 'Italian',
  es: 'Spanish',
  pt: 'Portuguese',
};

const preview = {
  ko: [{ text: '인생의 의미는 무엇인가?' }],
  ru: [{ text: 'в чем смысл жизни' }],
  fr: [{ text: 'Quel est le sens de la vie' }],
  it: [{ text: 'qual è il significato della vita' }],
  es: [{ text: 'Cual es el significado de la vida' }],
  pt: [{ text: 'Qual é o sentido da vida' }],
};

function getParameters() {
  return queryString.parse(window.location.search);
}

function isPreview() {
  return getParameters().assignmentId === 'ASSIGNMENT_ID_NOT_AVAILABLE';
}

function getUserSay() {
  if (isPreview()) {
    return { data: [{ text: "what's the meaning of life" }] };
  }
  return JSON.parse(getParameters().userSay);
}

function getPhrase() {
  return getUserSay()
    .data.map(entity => entity.text)
    .join();
}

class App extends Component {
  state = {
    translation: {
      count: 0,
      data: isPreview() ? preview[getParameters().language] : [],
    },
  };

  handleChange = e => {
    this.setState({
      translation: {
        count: 0,
        data: [
          {
            text: e.target.value,
            userDefined: false,
          },
        ],
      },
    });
  };

  handleCopy = e => {
    alert('Copy is disabled');
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
  };

  handlePaste = e => {
    alert('Paste is disabled');
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
  };

  render() {
    return (
      <div className="App">
        <form
          name="mturk_form"
          method="post"
          id="mturk_form"
          action={`${getParameters().turkSubmitTo}/mturk/externalSubmit`}
        >
          <input
            type="hidden"
            value={getParameters().assignmentId}
            name="assignmentId"
            id="assignmentId"
          />
          <input
            type="hidden"
            value={JSON.stringify(this.state.translation)}
            name="translation"
            id="translation"
          />
          <p onCopy={this.handleCopy}>English phrase: "{getPhrase()}"</p>
          <p>{languageName[getParameters().language]} translation here:</p>
          <p>
            <input
              type="text"
              size="80"
              onPaste={this.handlePaste}
              value={this.state.translation.data.map(item => item.text)}
              onChange={this.handleChange}
            />
          </p>
          <p>
            <input
              type="submit"
              id="submitButton"
              disabled={isPreview()}
              value={
                isPreview()
                  ? 'You must ACCEPT the HIT before you can submit the results.'
                  : 'Submit'
              }
            />
          </p>
        </form>
      </div>
    );
  }
}

export default App;
