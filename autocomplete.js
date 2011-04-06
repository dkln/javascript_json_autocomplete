// Super 1337 Autocompletion class
var Autocomplete = function(root) {
  this.root = $(root);
  this.initialize();
}

Autocomplete.prototype = {
  // constructor
  initialize: function() {
    this.selectedValue = this.root.val();

    if(this.root.attr('tagName') == 'INPUT' && this.root.attr('type') == 'text') {
      this.input = this.root;
      this.freeInput = true;

    } else if(this.root.attr('tagName') == 'SELECT') {
      // create new input field for autocompletion
      this.freeInput = false;
      this.input = this.createInput();
      this.input.attr("autocomplete", "off");

      // remove from DOM
      this.root.remove();

      // multiselect?
      this.multiselect = this.root.attr('multiple');

      // show details?
      this.showDetails = this.root.attr('data-show-details');

      // add a list with multi vals
      if(this.multiselect || this.showDetails) {

        if(this.multiselect) {
          // create empty array
          hidden = $('<input type="hidden" />');
          hidden.attr('id', this.root.attr('id') + '_val_empty');
          hidden.attr('name', this.root.attr('name'));
          hidden.val('');

          this.input.after(hidden);
        }

        // add a div
        this.multiselectListContainer = this.createMultiselectListContainer();
        // and a ul
        this.multiselectList = this.createMultiselectList();
        this.itemUrl = this.root.attr('data-item-url');
      }

      // set default texts
      this.setDefaultVals();
    }

    // create dropdown and hidden fields
    this.dropdown = this.createDropdown();

    if(!this.multiselect && !this.freeInput) {
      this.hiddenField = this.createHiddenField();
      this.hiddenField.val(this.selectedValue);
    }

    this.autocompleteUrl = this.root.attr('data-autocomplete-url');

    this.input[0].autocomplete = this;

    // add keypress listener
    this.input.keypress(this.bind(this.handleKeypress));
    this.input.click(this.bind(this.handleInputClick));
    this.input.blur(this.bind(this.handleBlur));

    // finally, check the multivalues and autofill them
    if(this.multiselect || this.showDetails) {
      this.updateMultiVals();
      if(this.multiselect) this.updateMultiValHiddenField();
    }
  },

  // creates a multiselect list container
  createMultiselectListContainer: function() {
    var container = $('<div></div>');

    container.attr('id', this.root.attr('id') + '_value_list_container');
    container.attr('className', 'autocomplete_value_list');

    // insert dropdown after textfield
    this.input.after(container);

    return container;
  },

  // create a UL for the multiselector
  createMultiselectList: function() {
    var list = $('<ul></ul>');

    list.attr('id', this.root.attr('id') + '_value_list');
    this.multiselectListContainer.append(list);

    return list;
  },

  // requests the HTML for the multiselectbox list
  updateMultiVals: function() {
    var i = 0;
    var vals = this.selectedValue;

    if(!vals) vals = [];
    if(typeof(vals) == 'string' || typeof(vals) == 'number') vals = [vals];

    if(!this.multiselect && this.showDetails && vals[0] && this.multiselectList.find('li[rel]').length > 0) {
      var firstItem = $(this.multiselectList.find('li')[0]);

      if(firstItem.attr('rel') != vals[0]) {
        firstItem.remove();
      }
    }

    // loop every selected val
    for(i = 0; i < vals.length; i++) {
      // do already have a list item with this ID?
      if(this.multiselectList.find('li[rel="' + vals[i] + '"]').length == 0) {
        // no, so go request it!
        jQuery.getJSON(this.itemUrl.replace('%', vals[i]).replace('%25', vals[i]), this.bind(this.handleUpdateMultiValsResponse));
      }
    }
  },

  // is called when load for requestMultiVals is complete
  // NOTE: this thing only receives ONE item
  handleUpdateMultiValsResponse: function(data) {
    // we have received one item, good!
    var item;
    var i = 0;
    var list;

    // valid data?
    if(data && this.multiselectList.find('li[rel="' + data.id + '"]').length == 0) {
      // yes!
      // add this to the unsorted list
      item = $('<li></li>');
      item.append('<h3>' + data.name + '</h3>');

      if(data.extra && data.extra.length > 0) {
        table = $('<table></table>');

        for(i = 0; i < data.extra.length; i++) {
          table.append('<tr><th>' + data.extra[i][0] + '</th><td>' + data.extra[i][1] + '</td></tr>');
        }

        item.append(table);
      }

      item.attr('rel', data.id);

      if(this.multiselect)
        item.click(this.bind(this.handleMultiValItemClick));

      // add to list
      this.multiselectList.append(item);
    }
  },

  updateMultiValHiddenField: function() {
    var i = 0;
    var values = this.selectedValue;
    var hidden;

    if(!values) values = [];

    for(i = 0; i < values.length; i++) {
      if($('input#' + this.root.attr('id') + '_val_' + values[i]).length == 0) {
        hidden = $('<input type="hidden" />');
        hidden.attr('id', this.root.attr('id') + '_val_' + values[i]);
        hidden.attr('name', this.root.attr('name'));
        hidden.val(values[i]);

        this.input.after(hidden);
      }
    }
  },

  // catches the click event on a multival item
  handleMultiValItemClick: function(event) {
    // remove from values
    var item = $(event.currentTarget);
    var values = [];
    var newValues = [];
    var hidden;
    var i = 0;

    // remove from values
    values = this.selectedValue;

    for(i = 0; i < values.length; i++) {
      if(values[i] != item.attr('rel'))
        newValues.push(values[i]);
    }

    // set new array
    this.selectedValue = newValues;
    this.root.val(this.selectedValue);

    // also remove hidden field!
    hidden = $('input#' + this.root.attr('id') + '_val_' + item.attr('rel'));

    if(hidden) {
      hidden.remove();
      hidden = null;
    }

    item.remove();
    item = null;
  },

  // returns the ids in a string (joined with a comma)
  getMultipleVals: function() {
    return this.selectedValue.join(',');
  },

  setDefaultVals: function() {
    // set default texts
    if(this.root.attr('tagName') == 'SELECT') {
      if(this.multiselect) {
        // something...

      } else {
        this.input.val(this.currentSelectboxText());

      }
    }
  },

  // bind this obj
  bind: function(funct) {
    var context = this;
    return function() {
      return funct.apply(context, arguments);
    };
  },

  // returns the current selected text in a <select> box
  currentSelectboxText: function() {
    var option = this.root.find('option[value="' + this.selectedValue + '"]');
    return option.text();
  },

  // catches key presses of input
  handleKeypress: function(event) {
    // cancel dropdown?
    if(event.keyCode == 13) {
      this.handleKeypressTimer(this);
      return false;
    }
    else if(event.keyCode == 27) {
      this.dropdown.hide();

    } else {
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(this.handleKeypressTimer, 300, this);
    }
  },

  // is dispatched after keypress and after 300 ms.
  handleKeypressTimer: function(thisObject) {
    thisObject.filter();
  },

  // handles when a user leaves the text input
  handleBlur: function(event) {
    window.clearTimeout(this.blurTimer);
    this.blurTimer = window.setTimeout(this.bind(this.handleBlurTimer), 150, this);
  },

  // catches timer for hiding the dropdown
  handleBlurTimer: function(event) {
    this.dropdown.hide();
  },

  // displays the dropdown
  showDropdown: function() {
    window.clearTimeout(this.blurTimer);

    this.repositionDropdown();
    this.dropdown.show();
    this.dropdown.css('width', this.input.innerWidth());
  },

  // filters autocompletion
  filter: function() {
    this.input.parent().addClass('loading');
    jQuery.getJSON(this.autocompleteUrl.replace('%25', this.input.val()).replace('%', this.input.val()), this.bind(this.handleFilterResponse));
  },

  // catches response of ajax filter
  handleFilterResponse: function(data) {
    this.dropdown.empty();
    this.input.parent().removeClass('loading');

    // only one result?
    if(!data || data.length == 0) {
      this.input.parent().addClass('not-found')
      this.dropdown.hide();

    } else {
      // build the list!
      var i = 0;
      var list = $('<ul></ul>');
      var item;
      var link;

      this.input.parent().removeClass('not-found')

      // add list to dropdown
      this.dropdown.append(list);

      // loop every json result
      for(i = 0; i < data.length; i++) {
        // add to list
        item = $('<li></li>');
        item.attr('rel', data[i].id);
        item.text(data[i].name);

        // add clikc
        item.click(this.bind(this.handleListItemClick));

        list.append(item);
      }

      // only one possibility?
      if(data.length == 1 && this.root.attr('data-autoselect')) {
        this.dropdown.hide();
        window.clearTimeout(this.timer);
        this.timer = window.setTimeout(this.bind(this.handleOnlyOneRowTimer), 300, this);
      } else {
        this.showDropdown();
      }
    }
  },

  handleOnlyOneRowTimer: function(event) {
    this.selectItem(this.dropdown.find('ul li'));
  },

  // catches click on text input field
  handleInputClick: function(event) {
    this.filter();
  },

  // selects a link
  selectItem: function(item) {
    this.dropdown.hide();

    if(this.multiselect) {
      this.input.parent().removeClass('not-found');
      this.input.parent().addClass('found');

      var vals = this.selectedValue;
      if(!vals) vals = [];

      vals.push(item.attr('rel'));
      this.selectedValue = vals;
      this.updateMultiValHiddenField();
      this.input.val('');

    } else if(this.freeInput) {
      this.selectedValue = item.text();

    } else {

      this.selectedValue = item.attr('rel');
      this.hiddenField.val(item.attr('rel'));
      this.input.val(item.text());
    }

    this.root.val(this.selectedValue);
    this.input.focus();

    // auto submit?
    if(this.root.attr('data-autosubmit') == 'data-autosubmit') {
      // submits automaticly the form where the element is placed in
      addNoValidationFlag(this.root, this.input.parents('form'));
      this.input.parents('form').submit();
    }

    // retrieve & show all current selected items
    if(this.multiselect || this.showDetails)
      this.updateMultiVals();
  },

  // catches click on a item
  handleListItemClick: function(event) {
    this.selectItem($(event.currentTarget));
  },

  // positions the dropdown beneath the inputbox
  repositionDropdown: function() {
    this.dropdown.css({ left: this.input.position().left, top: this.input.position().top + this.input.outerHeight() });
  },

  // creates a dropdown-box and positions it relative to the root element
  createDropdown: function() {
    var dd = $('<div></div>');

    dd.attr('id', this.root.attr('id') + '_dropdown');
    dd.attr('className', 'autocomplete_dropdown');

    dd.hide();

    // insert dropdown after textfield
    this.input.after(dd);

    return dd;
  },

  // transforms the root obj into an input element
  createHiddenField: function() {
    // create a new root
    var hidden = $('<input type="hidden" />');
    hidden.attr('id', this.root.attr('id'));
    hidden.attr('name', this.root.attr('name'));

    // insert after textfield
    this.input.after(hidden);

    return hidden;
  },

  // creates an input text field
  createInput: function() {
    var input = $('<input type="text" />');
    var id = this.root.attr('id') + '_input';
    input.attr('id', id);
    input.attr('name', id);
    input.attr('className', 'autocomplete_input');
    input.attr('placeholder', this.root.attr('placeholder'));

    // insert after root
    this.root.after(input);

    // check if there is a labe
    var label = $("label[for='" + this.root.attr('id') + "']")

    if(label.length > 0) {
      label.attr('for', this.root.attr('id') + '_input');
    }

    return input;
  }
}

function applyAutocomplete() {
  $('.autocomplete').each(function() {
    if(!this.autocomplete) {
      this.autocomplete = new Autocomplete(this);
    }
  });
}

$(function() {
  applyAutocomplete();
});

