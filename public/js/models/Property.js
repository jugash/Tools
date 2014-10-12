define([
	'jquery',
	'backbone',
	'underscore'
	], function($, Backbone, _) {
	
	var Property = Backbone.Model.extend({

		urlRoot : '/properties',
		idAttribute : '_id',

		defaults : {
			_id : null,
			price : "",
			number : "",
			house : "",
			address : "",
			type : "",
			description : ""
		},

		initialize: function() {
			this.validate
		}

	});
	return Property;
});