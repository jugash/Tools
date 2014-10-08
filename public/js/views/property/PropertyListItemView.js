define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/property/item.html'
], function($, _, Backbone, itemTemplate){
  
  var PropertyListItemView =Backbone.View.extend({

	    tagName: "div",

	    className: "property-box",

	    initialize: function () {
	        this.model.bind("change", this.render, this);
	        this.model.bind("destroy", this.close, this);
	    },

	    render: function (elem) {
	        $(this.el).html(_.template(itemTemplate, {property : this.model, tags : elem.tags, index: elem.index}));
	        return this;
	    }

	});

  return PropertyListItemView;

});  