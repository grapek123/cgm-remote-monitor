'use strict';

var hourlystats = {
  name: 'hourlystats'
  , label: 'Hourly stats'
  , pluginType: 'report'
};

function init() {
  return hourlystats;
}

module.exports = init;

hourlystats.html = function html(client) {
  var translate = client.translate;
  var ret =
      '<h1>' + translate('Hourly stats') + '</h1>'
    + '<div id="hourlystats-overviewchart"></div>'
    + '<div id="hourlystats-report"></div>'
    ;
  return ret;
};

hourlystats.report = function report_hourlystats(datastorage, daystoshow, options) {
//console.log(window);
  var ss = require('simple-statistics');
  var Nightscout = window.Nightscout;
  var client = Nightscout.client;
  var translate = client.translate;

  var report = $('#hourlystats-report');
  var stats = [];
  var pivotedByHour = {};

  var data = datastorage.allstatsrecords;
  
  for (var i = 0; i < 24; i++) {
    pivotedByHour[i] = [];
  }
  data.forEach(function(record) {
    var d = new Date(record.displayTime);
    pivotedByHour[d.getHours()].push(record);
  });
  var table = $('<table width=\"100%\" border=\"1\">');
  var thead = $('<tr/>');
  $('<th>'+translate('Time')+'</th>').appendTo(thead);
  $('<th>'+translate('Readings')+'</th>').appendTo(thead);
  $('<th>'+translate('Average')+'</th>').appendTo(thead);
  $('<th>'+translate('Min')+'</th>').appendTo(thead);
  $('<th>'+translate('Quartile')+' 25</th>').appendTo(thead);
  $('<th>'+translate('Median')+'</th>').appendTo(thead);
  $('<th>'+translate('Quartile')+' 75</th>').appendTo(thead);
  $('<th>'+translate('Max')+'</th>').appendTo(thead);
  $('<th>'+translate('Standard Deviation')+'</th>').appendTo(thead);
  thead.appendTo(table);

  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23].forEach(function(hour) {
    var tr = $('<tr>');
    var display = hour % 12;
    if (hour === 0) {
      display = '12';
    }
    display += ':00 ';
    if (hour >= 12) {
      display += 'PM';
    } else {
      display += 'AM';
    }

    var avg = Math.floor(pivotedByHour[hour].map(function(r) { return r.sgv; }).reduce(function(o,v){ return o+v; }, 0) / pivotedByHour[hour].length);
    var d = new Date(hour.hours());

    var dev = ss.standard_deviation(pivotedByHour[hour].map(function(r) { return r.sgv; }));
    stats.push([
      new Date(d),
      ss.quantile(pivotedByHour[hour].map(function(r) { return r.sgv; }), 0.25),
      ss.quantile(pivotedByHour[hour].map(function(r) { return r.sgv; }), 0.75),
      avg - dev,
      avg + dev
    ]);
    var tmp;
    $('<td>' + display + '</td>').appendTo(tr);
    $('<td>' + pivotedByHour[hour].length + ' (' + Math.floor(100 * pivotedByHour[hour].length / data.length) + '%)</td>').appendTo(tr);
    $('<td>' + avg + '</td>').appendTo(tr);
    $('<td>' + Math.min.apply(Math, pivotedByHour[hour].map(function(r) { return r.sgv; })) + '</td>').appendTo(tr);
    $('<td>' + ((tmp=ss.quantile(pivotedByHour[hour].map(function(r) { return r.sgv; }), 0.25)) ? tmp.toFixed(1) : 0 ) + '</td>').appendTo(tr);
    $('<td>' + ((tmp=ss.quantile(pivotedByHour[hour].map(function(r) { return r.sgv; }), 0.5)) ? tmp.toFixed(1) : 0 ) + '</td>').appendTo(tr);
    $('<td>' + ((tmp=ss.quantile(pivotedByHour[hour].map(function(r) { return r.sgv; }), 0.75)) ? tmp.toFixed(1) : 0 ) + '</td>').appendTo(tr);
    $('<td>' + Math.max.apply(Math, pivotedByHour[hour].map(function(r) { return r.sgv; })) + '</td>').appendTo(tr);
    $('<td>' + Math.floor(dev*10)/10 + '</td>').appendTo(tr);
    table.append(tr);
  });

  report.empty();
  report.append(table);

  $.plot(
    '#hourlystats-overviewchart',
    [{
      data:stats,
      candle:true
    }],
    {
      series: {
        candle: true,
        lines: false    //Somehow it draws lines if you dont disable this. Should investigate and fix this ;)
      },
      xaxis: {
        mode: 'time',
        timeFormat: '%h:00',
        min: 0,
        max: (24).hours()-(1).seconds()
      },
      yaxis: {
        min: 0,
        max: options.units === 'mmol' ? 22: 400,
        show: true
      },
      grid: {
        show: true
      }
    }
  );
};