var ctx = {
    w: 860,
    h: 700,
    TRANSITION_DURATION: 400,
    countries: [],
    plantTypes: ['Hydro', 'Solar', 'Biomass', 'Geothermal', 'Wind'],
    startDate: 1990,
    endDate: 2015,
};

const PROJECTION = d3.geoStereographic()
    .center([8.0, 48.0])
    .scale(7500)
    .translate([-80, 4000]);

var createViz = function() {
    PROJECTION.rotate([0, 0]).center([0, 0]);
    var svgEl = d3.select("#gmap").append("svg");
    svgEl.attr("width", ctx.w);
    svgEl.attr("height", ctx.h);

    loadMapData(svgEl);
};

var loadMapData = function(svgEl) {
    Promise.all([
        d3.json("./data/germany.geojson"),
        d3.csv("./data/plz.csv"),
        d3.csv("./data/plant_data.csv"),
    ]).then(function(files) {
        ctx.countries = files[0];
        ctx.plzs = preprocessPlzData(files[1]);
        ctx.eeg = preprocessEEGData(files[2]);
        ctx.currentPlants = ctx.eeg;
        ctx.currentPlantTypes = [];
        drawViz(svgEl);
    });
};

var preprocessPlzData = function(plzs) {
    plzsDict = {};
    plzs.forEach(function(d) {
        plzsDict[d.plz] = d
    });
    return plzsDict;
}

var preprocessEEGData = function(eeg) {
    eeg.forEach(function(d) {
        if (d.plz in ctx.plzs) {
            d.lon = +ctx.plzs[d.plz].lon;
            d.lat = +ctx.plzs[d.plz].lat;
        }
        d.nennleistung = +d.nennleistung;
        d.year = +d.year;
    });
    return eeg.filter(function(d) {
        return d.lat != undefined && d.lon != undefined;
    });
}

var drawViz = function(svgEl){
  createPowerScale();
  createYearScale();
  addMap(svgEl);
  addSlider();
  addPowerScale(svgEl);
  addPlantTypeScale(svgEl);
  addSelect();
  addYearText(svgEl);
  addCountries();
};

var createPowerScale = function() {
    ctx.minPower = d3.min(ctx.eeg, d => d["nennleistung"]);
    ctx.maxPower = d3.max(ctx.eeg, d => d["nennleistung"]);
    ctx.powerScale = d3.scaleLinear()
        .domain([ctx.minPower, ctx.maxPower])
        .range([2, 30]);

    ctx.plantTypeScale = d3.scaleOrdinal(d3.schemeCategory10);
}

var createYearScale = function() {
    ctx.yearScale = d3.scaleLinear()
        .domain([ctx.startDate, ctx.endDate])
        .range([0, ctx.w / 2])
        .clamp(true);
    ctx.year = ctx.startDate;
};

var addMap = function(svgEl) {
    ctx.mapG = svgEl.append("g")
        .attr("id", "map");

    ctx.plants = svgEl.append("g")
        .attr("id", "plants");

    ctx.div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
};

var addCountries = function() {
    var path = d3
        .geoPath()
        .projection(PROJECTION);

    countries = d3.select("g#map")
        .selectAll("path")
        .data(ctx.countries.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("class", "country")
        .attr("fill-opacity", "0")
        .attr("border-color", "black");
};

var addYearText = function(svgEl) {
    svgEl
        .append("text")
        .text(ctx.year)
        .attr("id", "year")
        .attr("font-size", "55px")
        .attr("transform", "translate(620,90)");
};

var addPowerScale = function(svgEl) {
    var ticks = [ctx.maxPower, ctx.maxPower / 3, ctx.maxPower / 9, ctx.maxPower / 27].map(function(d) {
        return Math.round(d / 10 / 1000) * 10 * 1000;
    });
    var powerScale = svgEl.append("g");
    powerScale
        .attr("transform", "translate(130,210)");

    powerScale
        .append("text")
        .text("Power (MW)")
        .attr("font-size", "18px")
        .attr("align", "center")
        .attr("transform", "translate(" + -ctx.powerScale(ticks[0]) + "," + (-40 - ctx.powerScale(ticks[0]) * 2) + ")");

    var legendFontSize = 15
    powerScale.selectAll(".legend")
        .data(ticks)
        .enter()
        .append("text")
        .attr("font-size", legendFontSize + "px")
        .attr("align", "center")
        .attr("transform", function(d, i) {
            return "translate(" + (ctx.powerScale(ticks[0]) + 5) + "," + (legendFontSize / 3 + -ctx.powerScale(d) * 2 + i * 25) + ")"
        })
        .text(function(d) {
            return Math.round(d / 1000, 100)
        });

    powerScale.selectAll("circle")
        .data(ticks)
        .enter()
        .append("circle")
        .attr("r", function(d) {
            return ctx.powerScale(d);
        })
        .attr("fill-opacity", 0.1)
        .attr("stroke-opacity", 0.3)
        .attr("stroke", "black")
        .attr("fill", "black")
        .attr("transform", function(d, i) {
            return "translate(0," + (-ctx.powerScale(d) * 2 + i * 25) + ")"
        })
        .attr("class", "plant");
}

var addPlantTypeScale = function(svgEl) {
    var plantTypeScale = svgEl.append("g");

    var circleSize = 7;

    plantTypeScale
        .attr("transform", "translate(120,380)");

    plantTypeScale
        .append("text")
        .text("Plant Type")
        .attr("font-size", "18px")
        .attr("align", "center")
        .attr("transform", "translate(" + -15 + "," + (-40) + ")");

    var legendFontSize = 15
    plantTypeScale.selectAll(".legend")
        .data(ctx.plantTypes)
        .enter()
        .append("text")
        .attr("font-size", legendFontSize + "px")
        .attr("align", "center")
        .attr("transform", function(d, i) {
            return "translate(" + (circleSize + 5) + "," + (legendFontSize / 3 + -circleSize * 2 + i * 25) + ")"
        })
        .text(d => d);

    plantTypeScale.selectAll("circle")
        .data(ctx.plantTypes)
        .enter()
        .append("circle")
        .attr("r", function(d) {
            return circleSize;
        })
        .attr("fill-opacity", 0.6)
        .attr("stroke", d => ctx.plantTypeScale(d))
        .attr("fill", d => ctx.plantTypeScale(d))
        .attr("transform", function(d, i) {
            return "translate(0," + (-circleSize * 2 + i * 25) + ")"
        })
        .attr("class", "plant");
}

var addSelect = function() {
    var input = d3.select("#select")
        .append("form");

    ctx.plantTypes.forEach(function(type) {
        input.append("input")
            .attr("type", "checkbox")
            .attr("value", type)
            .attr("name", "plant-selection")
            .on("change", function(d) {
                updatePlants();
            });
        input.append("text")
            .text(type);
    });
};

// adapted from https://bl.ocks.org/mbostock/6452972
var addSlider = function() {
    var svgSlider = d3.select("#slider").append("svg")
        .attr("width", ctx.w)
        .attr("height", 60);

    var slider = svgSlider.append("g")
        .attr("class", "slider")
        .attr("transform", "translate(" + 220 + "," + 20 + ")");

    slider.append("line")
        .attr("class", "track")
        .attr("x1", ctx.yearScale.range()[0])
        .attr("x2", ctx.yearScale.range()[1])
        .select(function() {
            return this.parentNode.appendChild(this.cloneNode(true));
        })
        .attr("class", "track-inset")
        .select(function() {
            return this.parentNode.appendChild(this.cloneNode(true));
        })
        .attr("class", "track-overlay")
        .call(d3.drag()
            .on("start.interrupt", function() {
                slider.interrupt();
            })
            .on("start drag", function() {
                ctx.changeYear(ctx.yearScale.invert(d3.event.x));
            }));

    slider.insert("g", ".track-overlay")
        .attr("class", "ticks")
        .attr("transform", "translate(0," + 18 + ")")
        .selectAll("text")
        .data(ctx.yearScale.ticks(10))
        .enter()
        .append("text")
        .attr("x", ctx.yearScale)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .text(function(d) {
            return d;
        });

    var label = slider.append("text")
        .attr("class", "label")
        .attr("text-anchor", "middle")
        .text(ctx.startDate)
        .attr("transform", "translate(0," + (-25) + ")")

    var handle = slider.insert("circle", ".track-overlay")
        .attr("class", "handle")
        .attr("r", 9);

    ctx.changeYear = function(h) {
        year = parseInt(h);

        handle.attr("cx", ctx.yearScale(h));
        label
            .attr("x", ctx.yearScale(h))
            .text(year);

        d3.select("#year")
            .text(year);

        if (ctx.year != year) {
            ctx.year = year;
            updatePlants();
        }
    }
};

var addPlants = function(plants) {
    plant = d3.select("g#plants")
        .selectAll("circle")
        .data(plants, function(d) {
            return d.ort + "_" + d.anlagentyp
        });

    plant.exit()
        .remove();

    plant
        .attr("r", function(d) {
            return ctx.powerScale(d.nennleistung);
        });

    plant.enter()
        .append("circle")
        .attr("class", "plant")
        .attr("opacity", 0.6)
        .attr("cx", function(d) {
            return PROJECTION([d.lon, d.lat])[0];
        })
        .attr("cy", function(d) {
            return PROJECTION([d.lon, d.lat])[1];
        })
        .attr("r", function(d) {
            return ctx.powerScale(d.nennleistung);
        })
        .attr("fill", function(d) {
            return ctx.plantTypeScale(d.anlagentyp)
        })
        .on("mouseover", function(d) {
            ctx.div.transition()
                .duration(200)
                .style("opacity", .9);
            ctx.div.html(d.ort)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            ctx.div.transition()
                .duration(500)
                .style("opacity", 0);
        });
};

var updatePlants = function() {
    checkboxes = document.getElementsByName("plant-selection");
    plantTypes = Array.from(checkboxes).filter(d => d.checked).map(d => d.value)

    if(plantTypes != ctx.currentPlantTypes) {
      var newData = ctx.eeg.filter(function(plant) {
          return plantTypes.includes(plant.anlagentyp) && plant.year == year;
      });
      ctx.currentPlantTypes = plantTypes;
      ctx.currentPlants = newData;
    }
    addPlants(ctx.currentPlants);
};

var startTour = async function() {
  checkboxes = document.getElementsByName("plant-selection");
  for(j = 0; j < checkboxes.length; j++) {
    checkboxes[j].checked=true;
    for(i = 1990; i <= 2015; i++) {
      ctx.changeYear(i);
      await sleep(700);
    }
    await sleep(2000);
    checkboxes[j].checked=false;
    ctx.changeYear(1990);
    await sleep(500);
  }

  for(j = 0; j < checkboxes.length; j++) {
    checkboxes[j].checked=true;
  }
  for(i = 1990; i <= 2015; i++) {
    ctx.changeYear(i);
    await sleep(700);
  }
  await sleep(2000);
  for(j = 0; j < checkboxes.length; j++) {
    checkboxes[j].checked=false;
  }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};
