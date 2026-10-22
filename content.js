
let CONTENT_LIBRARY = [];

async function loadContent() {
  const res = await fetch("content.json");
  const data = await res.json();
  CONTENT_LIBRARY = data.library;
  return CONTENT_LIBRARY;
}

function getVideoById(id) {
  return CONTENT_LIBRARY.find(v => v.id === id);
}
