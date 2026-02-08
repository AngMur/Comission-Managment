const mongoose = require('mongoose');

const rolesSchema = new mongoose.Schema({
    name: String,
    description:String,
    permissions: []
}, {strict : false});

module.exports = mongoose.model('roles', rolesSchema);