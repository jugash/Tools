define([
  'jquery',
  'underscore',
  'backbone',
  'views/property/PropertyListItemView',
  'text!templates/property/tableskeleton.html'
], function($, _, Backbone, PropertyListItemView, tableTemplate){
  var PropertyListView = Backbone.View.extend({
    
    tagName: "div",

    render: function(params) {

        var tags = [];
        if(params.tags) {
          tags = params.tags.split(",");
        }

        var properties = this.collection.models;

        $(this.el).html(_.template(tableTemplate));

        $('#resultsCount', this.el).append(properties.length + " properties found");

        for (var i = 0; i <  properties.length; i++) {
            $('.thumbnails', this.el).append(new PropertyListItemView(
                  {model: properties[i]}).render({tags : tags, index : i}).el);
        }

        return this;
    }

  });

  return PropertyListView;

});