const express = require('express');
const app = express();
const path = require('path');
// const fs = require('fs');
// app.use(express.json);

// const data79 = fs.readFileSync(
//   './data/nakamura_1979_sm_locations.json',
//   'utf8'
// );
// const data83 = fs.readFileSync(
//   './data/nakamura_1983_ai_locations.json',
//   'utf8'
// );
// const data05 = fs.readFileSync(
//   './data/nakamura_2005_dm_locations.json',
//   'utf8'
// );

app.use('/', express.static(path.join(__dirname, '/public')));
app.use(
  '/build/',
  express.static(path.join(__dirname, 'node_modules/three/build'))
);
app.use(
  '/jsm/',
  express.static(
    path.join(__dirname, 'node_modules/three/examples/jsm')
  )
);
app.use(
  '/three-mmi/',
  express.static(
    path.join(
      __dirname,
      'node_modules/@danielblagy/three-mmi/module/'
    )
  )
);

// app.use('/api/data/', (req, res) => {
//   res.status(200).send({
//     data79,
//     data83,
//     data05,
//   });
// });

app.listen(3000, () => console.log('http://localhost:8080'));
