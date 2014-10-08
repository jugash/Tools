define([
    'underscore',
	'backbone',
	'models/Property'
], function(_, Backbone, PropertyModel){
	
	var Properties = Backbone.Collection.extend({

        model: PropertyModel,

        url: '/properties',

    });

    return Properties;
});