var objs = {};
var objIDList = [];
var pca_data;
var lc_original = {'data':{}};
var lc_fit = {'data': {}};
var lc_error = {'data': {}};
var plots = {};

var data_dir = "/static/data_ogle/"
// var path = "data_10/";

function changePlot(newPlotId) {
    if (newPlotId < 0) {
        console.log('unknown object');
        //TODO only show time vs mag plot
        return;
    }

    var period = objs[newPlotId].period;

    // plot current selection
    plotObject(newPlotId, period);
    document.getElementById("selection")
    .childNodes[0].children[objs[newPlotId].index].selected = true;
}

function simpleDot(sel) {
  sel.attr("fill", "black")
    .attr("stroke", "none")
    .attr("r", 2.5)
    .attr("fill-opacity", 0.5);
}

d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
        this.parentNode.appendChild(this);
    });
};

var surveyList = ['linear', 'ogle1', 'ogle2', 'ogle4'];
var loadCount = surveyList.length*4;
var doAfterLoading = function(loadCount){
    if(loadCount == 0) {
        var select = d3.select("#selection").append("select");

        select.on("change", function() {
            var id = this.options[this.selectedIndex].text.split(" ")[0];
            var period = this.options[this.selectedIndex].value;

            changePlot(id);
        });

        select.selectAll("option")
        .data(objIDList)
        .enter()
        .append("option")
        .attr("id", function(d) {
            return objs[d].attrs.uid;
        })
        .attr("value", function(d) {
            return objs[d].period;
        })
        .text(function(d) {
            if (objs[d].period> 0)
                return objs[d].attrs.uid;
            else
                return objs[d].attrs.uid + " *";
        });

        // plot the first object when starting
        plotObject(objs[objIDList[0]].attrs.uid,
                   objs[objIDList[0]].period);

        // plot SDSS color-color
        plotU_G();
        plotR_I();

        // plot the result of PCA
        d3.json(data_dir + "/pca.json", function(data) {
            pca_data = data;
            plotPCA(data);
        });
    }
};

for(var i = 0; i < surveyList.length; ++i) {
    var meta_path = data_dir+ "/"+surveyList[i]+"_meta.json";
    var dat_path = data_dir+'/lightcurves/'+surveyList[i]+'/dat.json'
    var fit_path = data_dir+'/lightcurves/'+surveyList[i]+'/fit.json'
    var fit_error_path = data_dir+'/lightcurves/'+surveyList[i]+'/fit_error.json'

    d3.json(meta_path, function(data) {
        var meta_data = data['data']
        for(var i = 0; i < meta_data.length; i ++){
            objs[meta_data[i].uid] = {'period': Number(meta_data[i].P),
                                      'index': i,
                                      'attrs': meta_data[i]};
            objIDList.push(meta_data[i].uid);
        }
        loadCount --;
        doAfterLoading(loadCount);
    });

    d3.json(dat_path, function(d){
        for(var attrname in d['data']) {
            lc_original['data'][attrname] = d['data'][attrname];
        }
        loadCount --;
        doAfterLoading(loadCount);
    });
    d3.json(fit_path, function(d){
        for(var attrname in d['data']){
            lc_fit['data'][attrname] = d['data'][attrname];
        }
        lc_fit['phase'] = d['phase'];
        loadCount --;
        doAfterLoading(loadCount);
    });
    d3.json(fit_error_path, function(d){
        for(var attrname in d['data']){
            lc_error['data'][attrname] = d['data'][attrname];
        }
        lc_error['phase'] = d['phase'];
        loadCount --;
        doAfterLoading(loadCount);
    });
}


function plot2DScatter(data, sel, title) {
    var xExtent = d3.extent(data, function(row) {
        return row[1];
    });
    var yExtent = d3.extent(data, function(row) {
        return row[2];
    });

    var plotWidth = 300;
    var plotHeight = 300;

    var xScale = d3.scale.linear().domain(xExtent).range([50, plotWidth - 30]);
    var yScale = d3.scale.linear().domain(yExtent).range([plotHeight - 30, 30]);
    var xAxis = d3.svg.axis().scale(xScale).ticks(5);
    var yAxis = d3.svg.axis().scale(yScale).ticks(5);
    var colorScale = d3.scale.ordinal().domain([1, 2, 4, 5, 6, 3, 7, 8, 9, 11, 0, -1]).range([
        "#e41a1c",
        "#377eb8",
        "#4daf4a",
        "#984ea3",
        "#ff7f00",
        "#00ffff",
        "#00ffff",
        "#00ffff",
        "#00ffff",
        "#00ffff",
        "#00ffff",
        "black"
    ]);

    sel.select('svg').remove();
    var svgSel = sel.append("svg")
    .attr("width", plotWidth)
    .attr("height", plotHeight);

    function setDotColors(sel) {
        sel.attr("fill", function(d) {
            return colorScale(d[3]);
        })
        .attr("fill-opacity", 0.3)
        .attr("stroke", "none")
        .attr("cx", function(d) {
            return xScale(d[1]);
        })
        .attr("cy", function(d) {
            return yScale(d[2]);
        })
        .attr("r", 3);
    }

    var circleSel = svgSel.selectAll("circle").data(data).enter();

    circleSel.append("circle")
    .classed("clickable", true)
    .call(setDotColors);

    svgSel.append("g")
    .attr("transform", "translate(0, " + (plotHeight - 30).toString() + ")")
    .call(xAxis);

    yAxis.orient("left");
    svgSel.append("g")
    .attr("transform", "translate(50, 0)")
    .call(yAxis);

    svgSel.append('text')
          .attr('x', 120)
          .attr('y', 40)
          .text(title);
}

function plotU_G() {
    var ids = Object.keys(objs);
    data = [];
    for(var i = 0; i < ids.length; i ++){
        if (objs[ids[i]].attrs.u > -9.9) {
            row = [];
            row[0] = ids[i];
            row[1] = objs[ids[i]].attrs.u;
            row[2] = objs[ids[i]].attrs.g;
            row[3] = objs[ids[i]].attrs.LCtype;
            data.push(row);
        }
    }
    var sel = d3.select('#plotU_G');
    plot2DScatter(data, sel, 'u-g (SDSS)');
}

function plotR_I() {
    var ids = Object.keys(objs);
    data = [];
    for(var i = 0; i < ids.length; i ++){
        if (objs[ids[i]].attrs.u > -9.9) {
            row = [];
            row[0] = ids[i];
            row[1] = objs[ids[i]].attrs.r;
            row[2] = objs[ids[i]].attrs.i;
            row[3] = objs[ids[i]].attrs.LCtype;
            data.push(row);
        }
    }
    var sel = d3.select('#plotR_I');
    plot2DScatter(data, sel, 'r-i (SDSS)');
}

//////////////////////////////////////////////////////////////////////////////
// plot a periodic astro-object
function plotObject(id, period) {
    var originalLC = lc_original.data[id].V;
    var fitLC = lc_fit.data[id].V;
    var errorLC = lc_error.data[id].V;
    var phase = lc_fit.phase;

    // plot mag vs. time
    plotTimeMag(originalLC, 320, 200);
    if (period > 0) {
        var points = [];
        for (var i = 0; i < fitLC.mag.length; ++i) {
            points[i] = {
                'x': Number(phase[i]),
                'y': Number(fitLC.mag[i])
            };
        }

        // plot mag vs. phase
        plotPhaseMag(originalLC, period, points, fitLC.shift, 330, 200);

        // plot scaled mag vs. phase
        //plotPhaseMagScaled(originalLC, period, points, 360, 250);

        plotErrorHistogram(errorLC, 300, 300);
    } else {
        // clear previous plot
        d3.select("#right").selectAll("svg").remove();
        plots = {}
        plotTimeMag(json, 330, 200);
    }

};

//////////////////////////////////////////////////////////////////////////////
function plotAttribute(id) {
  var sel = d3.select("#plotAttribute");
  sel.selectAll("table").remove();
  if (id !== 'clean') {
      plotCrossMatch(id, sel);
  }
}

function setTitleStyle(sel) {
    sel.attr('bgcolor', '#bdbdbd');
}

function setHeaderStyle(sel) {
    sel.attr('bgcolor', '#bdbdbd');
}

function setCellStyle(sel) {
    sel.attr('bgcolor', '#f0f0f0');
}

function plotCrossMatch(id, sel) {
    d3.json(data_dir+'/external_associations_json/'+id+'.external.json', function(error, d) {
        if (error) return console.log("No cross match data.");

        var plotCatalogs = {};
        plotCatalogs.SingleRow = function (catalog, data, cols) {
            if (data != null) {
                var keys = Object.keys(data);
                var table = sel.append('table');

                var t_title = table.append('tr');
                t_title.append('th').text('Catalog').call(setTitleStyle);
                t_title.append('th').text(catalog).call(setTitleStyle);

                var i, j, temp, chunk = cols;
                if(cols == null) chunk = keys.length;
                for (i=0, j=keys.length; i < j; i += chunk) {
                    temp = keys.slice(i,i+chunk);

                    var t_header = table.append("tr")
                    .selectAll("th")
                    .data(temp)
                    .enter()
                    .append("th")
                    .html(function(d) {
                        return d;
                    })
                    .call(setHeaderStyle);

                    var t_content = table.append("tr")
                    .selectAll("td")
                    .data(temp)
                    .enter()
                    .append("td")
                    .html(function(d) {
                        return data[d];
                    })
                    .call(setCellStyle);
                }

            }
        }

        plotCatalogs.MultiRows = function (catalog, data) {
            if (data != null) {
                var keys = Object.keys(data[0]);
                var table = sel.append('table');

                var t_title = table.append('tr');
                t_title.append('th').text('Catalog').call(setTitleStyle);
                t_title.append('th').text(catalog).call(setTitleStyle);

                var t_header = table.append("tr")
                .selectAll("th")
                .data(keys)
                .enter()
                .append("th")
                .html(function(d) {
                    return d;
                })
                .call(setHeaderStyle);

                var matrix = [];
                for(var i = 0; i < data.length; i ++) {
                    var row = [];
                    for(var j = 0; j < keys.length; j ++) {
                        row[j] = data[i][keys[j]];
                    }
                    matrix[i] = row;
                }

                var t_content = table.selectAll('tr').data(matrix).enter()
                .append("tr")
                .selectAll('td')
                .data(function(d) {return d;})
                .enter()
                .append("td")
                .html(function(d, i) {
                    return d;
                })
                .call(setCellStyle);
            }
        }

        plotCatalogs.SingleRow('LINEAR', objs[id].attrs, 10);
        plotCatalogs.SingleRow('NED', d.NED, 4);
        plotCatalogs.SingleRow('IRSA', d.IRSA, 5);
        plotCatalogs.SingleRow('SIMBAD', d.SIMBAD, 4);
        plotCatalogs.MultiRows('IRSADUST', d.IRSADUST);
    });

}

//////////////////////////////////////////////////////////////////////////////

function createTimeMagPlot(data, width, height) {
  var plot = {};
  var plotWidth = width;
  var plotHeight = height;

  var xScale = d3.scale.linear().range([50, plotWidth - 30]);
  var yScale = d3.scale.linear().range([plotHeight - 30, 30]);
  var xAxis = d3.svg.axis().scale(xScale).ticks(5);
  var yAxis = d3.svg.axis().scale(yScale).ticks(5);

  plot.xScale = xScale;
  plot.yScale = yScale;
  plot.xAxis = xAxis;
  plot.yAxis = yAxis;
  yAxis.orient("left");

  plot.setCircleProperties = function(sel) {
    sel
      .call(simpleDot)
      .attr("cx", function(d) {
        return xScale(d.time);
      })
      .attr("cy", function(d) {
        return yScale(d.mag);
      });
  };

  var svgSel = d3.select("#plotTimeMag")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  plot.svgSel = svgSel;
  plot.xAxisGroup = svgSel.append("g").attr("transform", "translate(0, " + (plotHeight - 30).toString() + ")");
  plot.yAxisGroup = svgSel.append("g").attr("transform", "translate(50, 0)");
  return plot;
}

function plotTimeMag(data, width, height) {
  if (!plots.timeMag) {
    plots.timeMag = createTimeMagPlot(data, width, height);
  }
  var plot = plots.timeMag;

  var timeExtent = d3.extent(data, function(row) {
    return row.time;
  });
  var magExtent = d3.extent(data, function(row) {
    return row.mag;
  });

  var plotWidth = width;
  var plotHeight = height;

  var xScale = plot.xScale.domain(timeExtent);
  var yScale = plot.yScale.domain([magExtent[1], magExtent[0]]);

  var svgSel = plot.svgSel;

  var circleJoin = svgSel.selectAll("circle")
    .data(data);

  circleJoin.enter()
    .append("circle")
    .call(plot.setCircleProperties);

  circleJoin.call(plot.setCircleProperties);
  circleJoin.exit().remove();

  plot.xAxisGroup.call(plot.xAxis);
  plot.yAxisGroup.call(plot.yAxis);
};

//////////////////////////////////////////////////////////////////////////////

function createPhaseMagPlot(data, period, curve_points, width, height) {
  var plot = {};
  var plotWidth = width;
  var plotHeight = height;

  var xScale = d3.scale.linear().domain([-0.5, 1.5]).range([50, plotWidth - 30]);
  var yScale = d3.scale.linear().range([plotHeight - 30, 30]);
  var xAxis = d3.svg.axis().scale(xScale).tickValues([-0.5, 0, 0.5, 1, 1.5]);
  var yAxis = d3.svg.axis().scale(yScale).ticks(5);

  plot.xScale = xScale;
  plot.yScale = yScale;
  plot.xAxis = xAxis;
  plot.yAxis = yAxis;
  yAxis.orient("left");

  plot.setCircleProperties = function(shift) {
    return function(sel) {
      sel.call(simpleDot)
        .attr("cx", function(d) {
          return xScale(d.phase + shift);
        })
        .attr("cy", function(d) {
          return yScale(d.mag);
        });
    };
  };

  plot.setLineProperties = function(shift) {
    return function(sel) {
      sel.call(simpleDot)
        .attr("stroke", "black")
        .attr("x1", function(d) {
          return xScale(d.phase + shift);
        })
        .attr("x2", function(d) {
          return xScale(d.phase + shift);
        })
        .attr("y1", function(d) {
          return yScale(d.mag - d.error);
        })
        .attr("y2", function(d) {
          return yScale(d.mag + d.error);
        });
    };
  };

  var svgSel = d3.select("#plotPhaseMag")
    .append("svg")
    .attr("width", plotWidth)
    .attr("height", plotHeight);

  plot.svgSel = svgSel;
  plot.lineSel = svgSel.append("g");
  plot.circleSel = svgSel.append("g").attr("display", "none");
  plot.xAxisGroup = svgSel.append("g")
    .attr("transform", "translate(0, " + (plotHeight - 30).toString() + ")");
  plot.yAxisGroup = svgSel.append("g")
    .attr("transform", "translate(50, 0)");
  plot.curveSel = svgSel.append("g");

  return plot;
}

function plotPhaseMag(data, period, curve_points, shift, width, height) {
    // Normalize mag
    var sum = 0;
    for(var i = 0; i < data.length; i ++){
        data[i].mag = Number(data[i].mag);
        data[i].error = Number(data[i].error);
        data[i].time = Number(data[i].time);
        sum += data[i].mag;
    }
    var averageMag = sum/data.length;
    for(var i = 0; i < data.length; i ++){
        data[i].mag -= averageMag;
    }

  if (!plots.phaseMag) {
    plots.phaseMag = createPhaseMagPlot(data, period, curve_points, width, height);
  }
  var plot = plots.phaseMag;
  var timeExtent = d3.extent(data, function(row) {
    return row.time;
  });
  var magExtent = d3.extent(data, function(row) {
    return row.mag;
  });
  var t;

  for (var i = 0; i < data.length; i++) {
    t = data[i].time - timeExtent[0];
    data[i].phase = t / period - Math.floor(t / period);
  }

  var yScale = plot.yScale.domain([magExtent[1], magExtent[0]]);
  var svgSel = plot.svgSel;


  plot.circleSel.selectAll("circle").remove(); // Ungh.
  var circleJoin = plot.circleSel.selectAll("circle").data(data).enter();

  circleJoin.append("circle")
    .call(plot.setCircleProperties(0));

  circleJoin.append("circle")
    .filter(function(d) {
      return d.phase - 1 >= -0.5;
    })
    .call(plot.setCircleProperties(-1));

  circleJoin.append("circle")
    .filter(function(d) {
      return d.phase + 1 <= 1.5;
    })
    .call(plot.setCircleProperties(1));

  plot.lineSel.selectAll("line").remove(); // Ungh.
  var lineJoin = plot.lineSel.selectAll("line").data(data).enter();

  lineJoin.append("line")
    .call(plot.setLineProperties(0));
  lineJoin.append("line")
    .filter(function(d) {
      return d.phase - 1 >= -0.5;
    })
    .call(plot.setLineProperties(-1));
  lineJoin.append("line")
    .filter(function(d) {
      return d.phase + 1 <= 1.5;
    })
    .call(plot.setLineProperties(1));

  plot.xAxisGroup.call(plot.xAxis);
  plot.yAxisGroup.call(plot.yAxis);

  // plot curve
  var lineFunction = d3.svg.line()
    .x(function(d) {
      return plot.xScale(d.x);
    })
    .y(function(d) {
      return yScale(d.y);
    })
    .interpolate("basis");

  var front_data = [];
  var end_data = [];
  for (var i = 0; i < curve_points.length; ++i) {
    if (curve_points[i].x > 0.5)
      front_data.push({
        'x': curve_points[i].x - 1,
        'y': curve_points[i].y
      });
    else
      end_data.push({
        'x': curve_points[i].x + 1,
        'y': curve_points[i].y
      });
  }
  curve_points = front_data.concat(curve_points, end_data);

  //var translate = "translate(0,0)";

  // Shift back fitted curve
  //if(shift != null){
    //curve_points.sort(function(a,b){
        //return a.x - b.x;
    //});
    //var shiftPixels = plot.xScale(0) - plot.xScale(curve_points[shift].x);
    //console.log(shiftPixels);
    //translate = "translate("+shiftPixels.toString()+", 0)";
  //}
  plot.curveSel.selectAll("path").remove();
  plot.curveSel.append('path')
    .attr('d', lineFunction(curve_points))
    .attr('stroke', 'blue')
    .attr('stroke-width', '2')
    .attr('fill', 'none');
};

//////////////////////////////////////////////////////////////////////////////

function createPhaseMagScaledPlot(data, period, curve_points, width, height) {
  var plot = {};
  var plotWidth = width;
  var plotHeight = height;

  var xScale = d3.scale.linear().domain([0, 1]).range([50, plotWidth - 30]);
  var yScale = d3.scale.linear().domain([1, -1]).range([plotHeight - 30, 30]);
  var xAxis = d3.svg.axis().scale(xScale).tickValues([-0.5, 0, 0.5, 1, 1.5]);
  var yAxis = d3.svg.axis().scale(yScale);
  yAxis.orient("left");

  var svgSel = d3.select("#plotPhaseMagScaled")
    .append("svg")
    .attr("width", plotWidth)
    .attr("height", plotHeight);
  plot.svgSel = svgSel;
  plot.circleSel = svgSel.append("g");
  plot.curveSel = svgSel.append("g");
  plot.xAxisGroup = svgSel.append("g")
    .attr("transform", "translate(0, " + (plotHeight - 30).toString() + ")");
  plot.yAxisGroup = svgSel.append("g")
    .attr("transform", "translate(50, 0)");
  plot.xAxis = xAxis;
  plot.yAxis = yAxis;
  plot.xScale = xScale;
  plot.yScale = yScale;

  return plot;
}

function plotPhaseMagScaled(data, period, curve_points, width, height) {
  if (!plots.phaseMagScale) {
    plots.phaseMagScale = createPhaseMagScaledPlot(
      data, period, curve_points, width, height);
  }
  var plot = plots.phaseMagScale;
  var timeExtent = d3.extent(data, function(row) {
    return row.time;
  });
  var magExtent = d3.extent(data, function(row) {
    return row.mag;
  });
  var magAverage = d3.mean(data, function(row) {
    return row.mag;
  });
  var t;

  var max_peak = 100;
  var max_phase = -1;
  for (var i = 0; i < curve_points.length; i++) {
    if (curve_points[i].y < max_peak) {
      max_peak = curve_points[i].y;
      max_phase = curve_points[i].x;
    }
  }

  var shift = max_phase - 0.3;

  function shiftFunction(d) {
    d = d - shift;
    if (d > 1) d = d - 1;
    if (d < 0) d = d + 1;
    return d;
  }

  for (var i = 0; i < data.length; i++) {
    t = data[i].time - timeExtent[0];
    data[i].phase = shiftFunction(t / period - Math.floor(t / period));
  }

  var plotWidth = width;
  var plotHeight = height;

  var xScale = plot.xScale;
  var yScale = plot.yScale;
  var xAxis = plot.xAxis;
  var yAxis = plot.yAxis;

  var svgSel = plot.svgSel;

  plot.circleSel.selectAll("circle").remove();
  var circleSel = plot.circleSel.selectAll("circle").data(data).enter();

  circleSel.append("circle")
    .call(simpleDot)
    .attr("cx", function(d) {
      return xScale(d.phase);
    })
    .attr("cy", function(d) {
      return yScale(d.mag - magAverage);
    });

  plot.xAxisGroup.call(plot.xAxis);
  plot.yAxisGroup.call(plot.yAxis);

  // plot curve
  for (var i = 0; i < curve_points.length; i++) {
    curve_points[i].x = shiftFunction(curve_points[i].x);
  }

  function sortFunction(a, b) {
    if (a.x == b.x) return 0;
    else
      return (a.x < b.x) ? -1 : 1;
  }

  curve_points.sort(sortFunction);

  var lineFunction = d3.svg.line()
    .x(function(d) {
      return xScale(d.x);
    })
    .y(function(d) {
      return yScale(d.y - magAverage);
    })
    .interpolate("basis");

  plot.curveSel.selectAll("path").remove();
  plot.curveSel.append('path')
    .attr('d', lineFunction(curve_points))
    .attr('stroke', 'blue')
    .attr('stroke-width', '2')
    .attr('fill', 'none');
};

//////////////////////////////////////////////////////////////////////////////

function plotPCA(data) {
    function getX(d) { return d.curve[0]; }
    function getY(d) { return d.curve[1]; }
    function getId(d) { return d.id; }
    function getType(d) { return d.type; }
    var xExtent = d3.extent(data, getX);
    var yExtent = d3.extent(data, getY);

  var plotWidth = 600;
  var plotHeight = 600;

  xExtent = [-30, 30];
  yExtent = [-30, 30];

  var xScale = d3.scale.linear().domain(xExtent).range([50, plotWidth - 30]);
  var yScale = d3.scale.linear().domain(yExtent).range([plotHeight - 30, 30]);
  var xAxis = d3.svg.axis().scale(xScale).ticks(5);
  var yAxis = d3.svg.axis().scale(yScale).ticks(5);
  var colorScale = d3.scale.ordinal()
    .domain(['1', '2', '4', '5', '6', '3', '7', '8', '9', '11', '0', '-1',
             'ecl', 'misc', 'rrlyr', 'lpv'])
    .range([
    "#e41a1c",
    "#377eb8",
    "#4daf4a",
    "#984ea3",
    "#ff7f00",
    "#00ffff",
    "#00ffff",
    "#00ffff",
    "#00ffff",
    "#00ffff",
    "#00ffff",
    "black",
    "#fbb4ae",
    "#b3cde3",
    "#ccebc5",
    "#decbe4"
  ]);

  var namesScale = d3.scale.ordinal()
    .domain(['1', '2', '4', '5', '6', '3', '7', '8', '9', '11', '0','-1',
             'ecl', 'misc', 'rrlyr', 'lpv'])
    .range([
    "RR Lyr ab",
    "RR Lyr c",
    "Algol-like with 2 minima",
    "Contact binary",
    "delta Scu/SX Phe",
    "Algol-like with 1 minima",
    "Long-period variable",
    "heartbeat candidates",
    "BL Her",
    "anomalous Cepheids",
    "other",
    "User Added Object",
    "ECL(OGLE)",
    "MISC(OGLE)",
    "RRLYR(OGLE)",
    "LPV(OGLE)"
  ]);

  d3.select("#plotPCA").select('svg').remove();
  var svgSel = d3.select("#plotPCA")
    .append("svg")
    .attr("width", plotWidth)
    .attr("height", plotHeight);

  var legendSel = svgSel.append("g").attr("transform", "translate(60,390)");
  var legendG = legendSel.selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("g")
    .classed("clickable", true);

  legendG.append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", function(d) {
      return colorScale(d);
    })
    .attr("y", function(d, i) {
      return i * 11;
    });

  legendG.append("text")
    .text(function(d) {
      return namesScale(d);
    })
    .attr("x", 12)
    .attr("y", function(d, i) {
      return i * 11 + 10;
    }).classed("legend", true);

  var circleSel = svgSel.selectAll("circle").data(data).enter();

  var pinnedDotSel = null;

  function setDotColors(sel) {
    sel.attr("fill", function(d) {
        return colorScale(getType(d));
    })
      .attr("display", "none") // quickest hack to hide old plot.
      .attr("fill-opacity", 0.3)
      .attr("stroke", "none")
      .attr("cx", function(d) {
          return xScale(getX(d));
      })
      .attr("cy", function(d) {
          return yScale(getY(d));
      })
      .attr("r", function(d) {
          return getType(d) < 0 ? 6 : 3;
      })
      .classed("clickable", true)
      .on("mouseover", function(d) {
        if (pinnedDotSel === null)
            changePlot(getId(d));
      })
      .on('click', highlightDot);
  }

  function highlightDot(d) {
    d3.event.stopPropagation();

    if (d3.select(this).classed('pinned')) {
      unhighlightDot(pinnedDotSel);
      return;
    }

    if (pinnedDotSel !== null) {
      unhighlightDot(pinnedDotSel);
    }

    pinnedDotSel = d3.select(this);

    pinnedDotSel.attr("fill-opacity", 1)
      .attr('r', 6)
      .attr('stroke', 'black')
      .classed('pinned', true)
      .moveToFront();

    changePlot(getId(d));

    //show other information associated with this dot
      attrs = objs[getId(d)].attrs;
    var imgsrc = 'http://skyservice.pha.jhu.edu/DR12/ImgCutout/getjpeg.aspx?ra=' + attrs.ra + '&dec=' + attrs.dec + '&scale=0.4&width=280&height=280&opt=L&query=&Label=on';
    d3.select("#obj_img").append("img")
      .attr('src', imgsrc);

      // plot external catalog info
      plotAttribute(getId(d));
  }

  function unhighlightDot(sel) {
    sel.attr("fill-opacity", 0.3)
      .attr("r", function(d) {
          return getType(d) < 0 ? 6 : 3;
      })
      .attr('stroke', 'none')
      .classed('pinned', false);
    pinnedDotSel = null;

    d3.select("#obj_img").select("img").remove();
    plotAttribute('clean');
  }

  circleSel.append("circle")
    .classed("clickable", true)
    .call(setDotColors);

  var allCircles = svgSel.selectAll("circle");

  // reset dot color when click on blank area
  svgSel.on("click", function() {
    allCircles.call(setDotColors);

    if (pinnedDotSel !== null)
      unhighlightDot(pinnedDotSel);
  })

  legendG.on("click", function(type) {
    d3.event.stopPropagation();

    if (pinnedDotSel !== null)
      unhighlightDot(pinnedDotSel);

    var s = allCircles;
    s.filter(function(d) {
        return getType(d) !== type;
      })
      .attr("fill", "gray")
      .attr("fill-opacity", 0.1)
      .classed("clickable", false)
      .on('click', function() {
        d3.event.stopPropagation();
      })
      .on("mouseover", function(d) {});
    s.filter(function(d) {
        return getType(d) === type;
      })
      .attr("fill", colorScale(type))
      .attr("fill-opacity", 0.5)
      .classed("clickable", true)
      .on("mouseover", function(d) {
        if (pinnedDotSel === null)
            changePlot(getId(d));
      })
      .moveToFront();
  });

  svgSel.append("g")
    .attr("transform", "translate(0, " + (plotHeight - 30).toString() + ")")
    .call(xAxis);

  yAxis.orient("left");
  svgSel.append("g")
    .attr("transform", "translate(50, 0)")
    .call(yAxis);

  init_webgl_tour(data, colorScale);

  // plot matrix weight
  // var axesSel = svgSel.append("g");
  // var axesLegend = svgSel.append("g");
  // d3.json(path+"pca_matrix.json", function(m) {
  //     var xs = m[0], ys = m[1];
  //     axesSel.selectAll("line")
  //         .data(xs)
  //         .enter()
  //         .append("line")
  //         .attr("x1",xScale(0))
  //         .attr("y1",yScale(0))
  //         .attr("x2",function(d,i) { return xScale(m[0][i] * 20); })
  //         .attr("y2",function(d,i) { return yScale(m[1][i] * 20); })
  //         .attr("stroke", function(d, i) {
  //             return d3.hcl(i / 50 * 360, 50, 50);
  //         });
  //
  //     axesLegend.selectAll("line")
  //         .data(xs)
  //         .enter()
  //         .append("line")
  //         .attr("x1",500)
  //         .attr("y1",500)
  //         .attr("x2",function(d,i) { return 500 + 20 * Math.cos(i / 50 * Math.PI * 2); })
  //         .attr("y2",function(d,i) { return 500 + 20 * Math.sin(i / 50 * Math.PI * 2); })
  //         .attr("stroke", function(d, i) {
  //             return d3.hcl(i / 50 * 360, 50, 70);
  //         })
  //         .attr("stroke-width", 3);
  // });
}

///////////////////////////////////////////////////
var userObjCount = 0;
var uploadedData = null;

function plotUserObject() {
  $.ajax({
    url: "/plotusers",
    type: "POST",
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    data: uploadedData,
    success: function(d) {
      userObjCount += 1;
      pca_data.push([d.x, d.y, -1, -1]);
      plotPCA(pca_data);
    }
  });
}

function clearUserObject() {
  while (userObjCount > 0) {
    pca_data.pop();
    userObjCount -= 1;
  }

  plotPCA(pca_data);
}

function handleFileSelect(evt) {
    var file = evt.target.files[0];

    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = function(e) {
        uploadedData = reader.result;
    };

    // Read in the image file as a data URL.
    reader.readAsText(file);
}

window.onload = function() {
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
};

