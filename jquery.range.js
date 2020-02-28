/*jshint multistr:true, curly: false */
/*global jQuery:false, define: false */
/**
 * jRange - Awesome range control
 *
 * Written by
 * ----------
 * Nitin Hayaran (nitinhayaran@gmail.com)
 *
 * Licensed under the MIT (MIT-LICENSE.txt).
 *
 * @author Nitin Hayaran
 * @version 0.1-RELEASE
 *
 * Modified by zyn @20190419
 *  + fix init value null bug
 *  + add rangeCount property for multiple range support
 * Dependencies
 * ------------
 * jQuery (http://jquery.com)
 *
 **/
;
(function($, window, document, undefined) {
	'use strict';

	var jRange = function() {
		return this.init.apply(this, arguments);
	};
	jRange.prototype = {
		defaults: {
			from : 0,
			to: 100,
			onstatechange: function() {},
			ondragend: function() {},
			onbarclicked: function() {},
			isRange: false,
			showLabels: true,
			showScale: true,
			step: 1,
			format: '%s',
			theme: 'theme-blue',
			width: 300,
			disable: false,
			snap: false
		},
		template: '<div class="slider-container">\
			<div class="back-bar">\
								<div class="selected-bar"></div>\
								<div class="pointer low" labelIdx="low"></div><div class="pointer-label low">123456</div>\
								<div class="pointer high" labelIdx="high"></div><div class="pointer-label high">456789</div>\
								<div class="clickable-dummy"></div>\
						</div>\
						<div class="scale"></div>\
		</div>',
		init: function(node, options) {
			this.options       = $.extend({}, this.defaults, options);
			this.inputNode     = $(node);
			this.options.value = this.inputNode.val() || (this.options.isRange ? this.options.from + ',' + this.options.from : '' + this.options.from);
			this.domNode       = $(this.template);
			this.domNode.addClass(this.options.theme);
			this.inputNode.after(this.domNode);
			this.domNode.on('change', this.onChange);
			this.pointers      = $('.pointer', this.domNode);
			this.lowPointer    = this.pointers.first();
			this.highPointer   = this.pointers.last();
			this.allPointers      = [this.lowPointer];
			this.labels        = $('.pointer-label', this.domNode);
			this.lowLabel      = this.labels.first();
			this.highLabel     = this.labels.last();
			this.scale         = $('.scale', this.domNode);
			this.bar           = $('.selected-bar', this.domNode);
			this.clickableBar  = this.domNode.find('.clickable-dummy');
			this.interval      = this.options.to - this.options.from;
			this.reverse       = this.interval<0;
			this.rangeCount    = this.options.rangeCount||1;
			this.render();
		},
		render: function() {
			// Check if inputNode is visible, and have some width, so that we can set slider width accordingly.
			if (this.inputNode.width() === 0 && !this.options.width) {
				console.log('jRange : no width found, returning');
				return;
			} else {
				this.options.width = this.options.width || this.inputNode.width();
				this.domNode.width(this.options.width);
				this.inputNode.hide();
			}

			if (this.isSingle()) {
				this.lowPointer.hide();
				this.lowLabel.hide();
			} else{
				for(var i=1; i<this.rangeCount; i++){
					var mpt = $('<div class="pointer mid mid'+ i + '" labelIdx="mid' + i+ '"></div>');
					var mptl = $('<div class="pointer-label mid mid' + i + '">888888</div>');
			this.highPointer.before(mpt);
			mpt.after(mptl);
					this.allPointers[i] = mpt;
				}
				this.allPointers[this.allPointers.length] = this.highPointer;
				this.pointers = $('.pointer', this.domNode);
				this.labels = $('.pointer-label', this.domNode);
			}
			if (!this.options.showLabels) {
				this.labels.hide();
			}
			this.attachEvents();
			if (this.options.showScale) {
				this.renderScale();
			}
			this.setValue(this.options.value);
		},
		isSingle: function() {
			if (typeof(this.options.value) === 'number') {
				return true;
			}
			return (this.options.value.indexOf(',') !== -1 || this.options.isRange) ?
				false : true;
		},
		attachEvents: function() {
			this.clickableBar.click($.proxy(this.barClicked, this));
			this.pointers.on('mousedown touchstart', $.proxy(this.onDragStart, this));
			this.pointers.bind('dragstart', function(event) {
				event.preventDefault();
			});
		},
		onDragStart: function(e) {
			if ( this.options.disable || (e.type === 'mousedown' && e.which !== 1)) {
				return;
			}
			e.stopPropagation();
			e.preventDefault();
			var pointer = $(e.target);
			this.pointers.removeClass('last-active');
			pointer.addClass('focused last-active');
			this[(pointer.hasClass('low') ? 'low' : 'high') + 'Label'].addClass('focused');
			$(document).on('mousemove.slider touchmove.slider', $.proxy(this.onDrag, this, pointer));
			$(document).on('mouseup.slider touchend.slider touchcancel.slider', $.proxy(this.onDragEnd, this));
		},
		onDrag: function(pointer, e) {
			e.stopPropagation();
			e.preventDefault();

			if (e.originalEvent.touches && e.originalEvent.touches.length) {
				e = e.originalEvent.touches[0];
			} else if (e.originalEvent.changedTouches && e.originalEvent.changedTouches.length) {
				e = e.originalEvent.changedTouches[0];
			}

			var position = e.clientX - this.domNode.offset().left;
			this.domNode.trigger('change', [this, pointer, position]);
		},
		onDragEnd: function(e) {
			this.pointers.removeClass('focused')
				.trigger('rangeslideend');
			this.labels.removeClass('focused');
			$(document).off('.slider');
			this.options.ondragend.call(this, this.options.value);
		},
		barClicked: function(e) {
			if(this.options.disable) return;
			var x = e.pageX - this.clickableBar.offset().left;
			if (this.isSingle())
				this.setPosition(this.pointers.last(), x, true, true);
			else {
				var firstLeft = Math.abs(parseFloat(this.lowPointer.css('left'), 10)),
						lastLeft = Math.abs(parseFloat(this.highPointer.css('left'), 10)),
						mid = firstLeft + (lastLeft - firstLeft) / 2,
						pointer;
				if (x <= firstLeft) {
					pointer = this.lowPointer;
				} else if (x >= lastLeft) {
					pointer = this.highPointer;
				} else if (this.rangeCount <= 1){
					pointer = x > mid ? this.highPointer : this.lowPointer;
				}else{
					for (var i = 1, l = this.pointers.length; i < l; i++) {
						var pt = this.pointers.eq(i);
						var prevPt = i == 0 ? pt : this.pointers.eq(i - 1);
						firstLeft = Math.abs(parseFloat(prevPt.css('left'), 10));
						lastLeft = Math.abs(parseFloat(pt.css('left'), 10));
						mid = firstLeft + (lastLeft - firstLeft) / 2;
						if (x > firstLeft && x < lastLeft) {
							pointer = x > mid ? pt : prevPt;
							break;
						}
					}
				}

				// var firstLeft      	= Math.abs(parseFloat(this.pointers.first().css('left'), 10)),
				// 		firstHalfWidth 	= this.pointers.first().width() / 2,
				// 		lastLeft 			 	= Math.abs(parseFloat(this.pointers.last().css('left'), 10)),
				// 		lastHalfWidth  	= this.pointers.first().width() / 2,
				// 		leftSide        = Math.abs(firstLeft - x + firstHalfWidth),
				// 		rightSide       = Math.abs(lastLeft - x + lastHalfWidth),
				// 		pointer;
				//
				// if(leftSide == rightSide) {
				// 	pointer = x < firstLeft ? this.pointers.first() : this.pointers.last();
				// } else {
				// 	pointer = leftSide < rightSide ? this.pointers.first() : this.pointers.last();
				// }


				this.setPosition(pointer, x, true, true);
			}
			this.options.onbarclicked.call(this, this.options.value);
		},
		onChange: function(e, self, pointer, position) {
			var min, max;
			min = 0;
			max = self.domNode.width();

			if (!self.isSingle()) {
				var prevPt = pointer.hasClass("low") ? self.lowPointer : pointer.prevAll(".pointer").first();
				var nextPt = pointer.hasClass("high") ? self.highPointer : pointer.nextAll(".pointer").first();
				min = pointer.hasClass('low') ? 0 : parseFloat(prevPt.css("left")) + (prevPt.width()/2);
				max = pointer.hasClass('high') ? self.domNode.width(): parseFloat(nextPt.css("left")) + (nextPt.width()/2);

				// min = pointer.hasClass('low') ? parseFloat(self.lowPointer.css("left")) + (self.lowPointer.width() / 2) : 0;
				// max = pointer.hasClass('low') ? parseFloat(self.highPointer.css("left")) + (self.highPointer.width() / 2) : self.domNode.width();
			}

			var value = Math.min(Math.max(position, min), max);
			self.setPosition(pointer, value, true);
		},
		setPosition: function(pointer, position, isPx, animate) {
			var lowPos = parseFloat(this.lowPointer.css("left"))||0;
			var highPos = parseFloat(this.highPointer.css("left"))||0;
			var circleWidth = this.highPointer.width() / 2;
			if (!isPx) {
				position = this.prcToPx(position);
			}
			if(this.options.snap){
				var expPos = this.correctPositionForSnap(position);
				if(expPos === -1){
					return;
				}else{
					position = expPos;
				}
			}
			if (pointer[0] === this.highPointer[0]) {
				highPos = Math.round(position - circleWidth);
			} else if(pointer[0] === this.lowPointer[0]) {
				lowPos = Math.round(position - circleWidth);
			}
			pointer[animate ? 'animate' : 'css']({
				'left': Math.round(position - circleWidth)
			});

			var w = Math.round(highPos - lowPos);
			this.bar[animate ? 'animate' : 'css']({
				'width': Math.abs(w),
				'left': this.isSingle() ? 0 : lowPos
			});

			this.showPointerValue(pointer, position, animate);
			this.isReadonly();
		},
		correctPositionForSnap: function(position){
			var currentValue = this.positionToValue(position) - this.options.from;
			var diff = this.options.width / (this.interval / this.options.step),
				expectedPosition = (currentValue / this.options.step) * diff;
			if( position <= expectedPosition + diff / 2 && position >= expectedPosition - diff / 2){
				return expectedPosition;
			}else{
				return -1;
			}
		},
		// will be called from outside
		setValue: function(value) {
			var values = value.toString().split(',');
			values[0] = parseFloat(values[0]);
			values[0] = isNaN(values[0]) ? this.options.from : values[0];
			if(this.reverse)
				values[0] = Math.max(Math.min(values[0], this.options.from), this.options.to) + '';
			else
				values[0] = Math.min(Math.max(values[0], this.options.from), this.options.to) + '';
			if(this.rangeCount>1){
				for(var i=1; i<=this.rangeCount; i++){
					values[i] = parseFloat(values[i]);
					values[i] = isNaN(values[i]) ? values[i-1] : values[i];
					if(this.reverse)
						values[i] = Math.max(Math.min(values[i], values[i-1]), this.options.to) + '';
					else
						values[i] = Math.min(Math.max(values[i], values[i-1]), this.options.to) + '';
				}
			}else {
				if (values.length > 1) {
					values[1] = parseFloat(values[1]);
					values[1] = isNaN(values[1]) ? this.options.to : values[1];
					if(this.reverse)
						values[1] = Math.max(Math.min(values[1], this.options.from), this.options.to) + '';
					else
						values[1] = Math.min(Math.max(values[1], this.options.from), this.options.to) + '';
				}
			}
			this.options.value = value;
			var prc = this.valuesToPrc(values.length >= 2 ? values : [0, values[0]]);
			if (this.isSingle()) {
				this.setPosition(this.highPointer, prc[1]);
			} else {
				this.setPosition(this.lowPointer, prc[0]);
				for(var i=1; i<=this.rangeCount; i++) {
					this.setPosition(this.allPointers[i], prc[i]);
				}
			}
		},
		renderScale: function() {
			var s = this.options.scale || [this.options.from, this.options.to];
			var prc = Math.round((100 / (s.length - 1)) * 10) / 10;
			var str = '';
			for (var i = 0; i < s.length; i++) {
				str += '<span style="left: ' + i * prc + '%">' + (s[i] != '|' ? '<ins>' + s[i] + '</ins>' : '') + '</span>';
			}
			this.scale.html(str);

			$('ins', this.scale).each(function() {
				$(this).css({
					marginLeft: -$(this).outerWidth() / 2
				});
			});
		},
		getBarWidth: function() {
			var values = this.options.value.split(',');
			if (values.length > 1) {
				return parseFloat(values[1]) - parseFloat(values[0]);
			} else {
				return parseFloat(values[0]);
			}
		},
		showPointerValue: function(pointer, position, animate) {
			var label = $('.pointer-label', this.domNode).filter("." + pointer.attr("labelIdx"));
			var text;
			var value = this.positionToValue(position);
			// Is it higer or lower than it should be?

			if ($.isFunction(this.options.format)) {
				var type = this.isSingle() ? undefined : (pointer.hasClass('low') ? 'low' : 'high');
				text = this.options.format(value, type);
			} else {
				text = this.options.format.replace('%s', value);
			}

			var width = label.html(text).width(),
				left = position - width / 2;
			left = Math.min(Math.max(left, 0), this.options.width - width);
			label[animate ? 'animate' : 'css']({
				left: left
			});
			this.setInputValue(pointer, value);
		},
		valuesToPrc: function(values) {
			var lowPrc = ((parseFloat(values[0]) - parseFloat(this.options.from)) * 100 / this.interval);
			var ret = [lowPrc];
			for(var i=1; i<=this.rangeCount; i++) {
				ret[i] = ((parseFloat(values[i]) - parseFloat(this.options.from)) * 100 / this.interval);
			}
			return ret;
		},
		prcToPx: function(prc) {
			return (this.domNode.width() * prc) / 100;
		},
		isDecimal: function() {
			return ((this.options.value + this.options.from + this.options.to).indexOf(".")===-1) ? false : true;
		},
		positionToValue: function(pos) {
			var value = (pos / this.domNode.width()) * this.interval;
			value = parseFloat(value, 10) + parseFloat(this.options.from, 10);
			if (this.isDecimal()) {
				var f = Math.round(Math.round(value / this.options.step) * this.options.step *100)/100;
				if (f!==0.0) {
					f = '' + f;
					if (f.indexOf(".")===-1) {
						f = f + ".";
					}
					while (f.length - f.indexOf('.')<3) {
						f = f + "0";
					}
				} else {
					f = "0.00";
				}
				return f;
			} else {
				return Math.round(value / this.options.step) * this.options.step;
			}
		},
		setInputValue: function(pointer, v) {
			// if(!isChanged) return;
			if (this.isSingle()) {
				this.options.value = v.toString();
			} else {
				var values = this.options.value.split(',');
				for(var i in this.allPointers){
					if(this.allPointers[i][0]===pointer[0]){
						values[i] = v.toString();
						break;
					}
				}
				this.options.value = values.join(",");
			}
			if (this.inputNode.val() !== this.options.value) {
				this.inputNode.val(this.options.value).trigger('change');
				this.options.onstatechange.call(this, this.options.value);
			}
		},
		getValue: function() {
			return this.options.value;
		},
		getOptions: function() {
			return this.options;
		},
		getRange: function() {
			return this.options.from + "," + this.options.to;
		},
		isReadonly: function(){
			this.domNode.toggleClass('slider-readonly', this.options.disable);
		},
		disable: function(){
			this.options.disable = true;
			this.isReadonly();
		},
		enable: function(){
			this.options.disable = false;
			this.isReadonly();
		},
		toggleDisable: function(){
			this.options.disable = !this.options.disable;
			this.isReadonly();
		},
		updateRange: function(range, value) {
			var values = range.toString().split(',');
			this.options.from = parseInt(values[0]);
			this.options.to = parseInt(values[1]);
			this.interval = this.options.to - this.options.from;
			if(value){
				this.setValue(value);
			}else{
				this.setValue(this.getValue());
			}
		}
	};

	var pluginName = 'jRange';
	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn[pluginName] = function(option) {
		var args = arguments,
			result;

		this.each(function() {
			var $this = $(this),
				data = $.data(this, 'plugin_' + pluginName),
				options = typeof option === 'object' && option;
			if (!data) {
				$this.data('plugin_' + pluginName, (data = new jRange(this, options)));
				$(window).resize(function() {
					data.setValue(data.getValue());
				}); // Update slider position when window is resized to keep it in sync with scale
			}
			// if first argument is a string, call silimarly named function
			// this gives flexibility to call functions of the plugin e.g.
			//   - $('.dial').plugin('destroy');
			//   - $('.dial').plugin('render', $('.new-child'));
			if (typeof option === 'string') {
				result = data[option].apply(data, Array.prototype.slice.call(args, 1));
			}
		});

		// To enable plugin returns values
		return result || this;
	};

})(jQuery, window, document);
