import fetch from 'node-fetch';

const url = 'http://localhost:3000/api/inventory/items?limit=5';

fetch(url)
  .then(async (res) => {
    console.log('status', res.status);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  })
  .catch((err) => console.error(err));
