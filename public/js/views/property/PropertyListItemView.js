define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/property/item.html',
  'text!templates/property/tableitem.html'
], function($, _, Backbone, itemTemplate, tableItemTemplate){
  
  var PropertyListItemView =Backbone.View.extend({

	    tagName: "tr",

	    className: "property-box",

	    initialize: function () {
	        this.model.bind("change", this.render, this);
	        this.model.bind("destroy", this.close, this);
	    },

	    render: function (elem) {
	        $(this.el).html(_.template(tableItemTemplate, {property : this.model, tags : elem.tags, index: elem.index}));
	        return this;
	    }

	});

  return PropertyListItemView;

});  