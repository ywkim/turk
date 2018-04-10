import randomSeed from 'random-seed';
const TODAY = new Date().toDateString();

const colors = [
  { name: 'blue', bg: '#0074d9' },
  { name: 'navy', bg: '#001f3f' },
  { name: 'lime', bg: '#01ff70' },
  { name: 'teal', bg: '#39cccc' },
  { name: 'olive', bg: '#3d9970' },
  { name: 'fuchsia', bg: '#f012be' },
  { name: 'red', bg: '#ff4136' },
  { name: 'green', bg: '#2ecc40' },
  { name: 'orange', bg: '#ff851b' },
  { name: 'maroon', bg: '#85144b' },
  { name: 'purple', bg: '#b10dc9' },
  { name: 'yellow', bg: '#ffdc00' },
  { name: 'aqua', bg: '#7fdbff' },
];

const unknownColor = { name: 'grey', bg: '#aaaaaa' };

// https://stackoverflow.com/a/28056903/300653
function hexToRGB(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  } else {
    return 'rgb(' + r + ', ' + g + ', ' + b + ')';
  }
}

export default function getColor(no) {
  const rand = randomSeed.create(TODAY);
  const startIndex = rand(colors.length);
  const color =
    no < 0 ? unknownColor : colors[(startIndex + no) % colors.length];

  return {
    backgroundColor: hexToRGB(color.bg, 0.3),
  };
}

global.getColor = getColor;
