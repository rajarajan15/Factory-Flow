const mongoose = require('mongoose');

const graphSchema = new mongoose.Schema({
  data: {
    type: Object,
    required: true,
  },
});

const Graph = mongoose.model('SFS-Graph-2', graphSchema);

module.exports = Graph;