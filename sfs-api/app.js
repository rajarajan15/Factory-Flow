const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const url = 'mongodb+srv://rajarajanshrihari:rajarajan15@database1.ubh3w.mongodb.net/';

const app = express(); // Use express() for the main application
const router = express.Router(); // Use express.Router() for modular routes

const Graph = require('./models/graph.model');

mongoose.connect(url);
const con = mongoose.connection;

con.on('open', () => {
    console.log('connected');
});

app.use(cors());
app.use(bodyParser.json());
// app.use('/api', router); // Mount the router on the '/api' path

// Define routes on the router
app.post('/api/save-graph', async (req, res) => {
    try {
      const graphData = new Graph({ data: req.body });
      await graphData.save();
      res.status(200).json({ message: 'Graph saved successfully!' });
    } catch (error) {
      res.status(500).json({ message: 'Error saving graph', error });
    }
  });  

app.get('/api/graphs/:id', async (req, res) => {
    try {
      const graph = await Graph.findById(req.params.id);
      if (!graph) {
        return res.status(404).json({ message: 'Graph not found' });
      }
      res.status(200).json(graph);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving graph', error });
    }
  });

app.get('/api/graphs', async (req, res) => {
    try {
      const graphs = await Graph.find({}, '_id'); // Fetch only IDs
      res.status(200).json(graphs);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching graphs', error });
    }
  });

// Start the server
const port = 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
