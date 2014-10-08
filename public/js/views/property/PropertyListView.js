define([
  'jquery',
  'underscore',
  'backbone',
  'views/property/PropertyListItemView',
  'text!templates/property/tableskeleton.html'
], function($, _, Backbone, PropertyListItemView, tableTemplate){
  var PropertyListView = Backbone.View.extend({
    
    tagName: "div",

    render: function(tags) {

        var properties = this.collection.models;

        $(this.el).html(_.template(tableTemplate));

        for (var i = 0; i <  properties.length; i++) {
            $('.thumbnails', this.el).append(new PropertyListItemView(
                  {model: properties[i]}).render({tags : tags.split(","), index : i}).el);
        }

        return this;
    }

  });

  return PropertyListView;

});