  var svg = d3.select("svg"),
      width = +svg.attr("width"),
      height = +svg.attr("height");

  var proj = d3.geoAlbers()
      .translate([width / 2, height / 2 - 50])
      .scale(1300);
  var Allpath = d3.geoPath()
      .projection(proj)

  var max_rate = 20
  var min_rate = 14

  var colorScale = d3.scaleLinear()
		  .domain([min_rate, max_rate])
		  .range(["#0000FF","#FF0000"])

  var circles = svg.append("svg:g")
      .attr("id", "circles");

  var Voro = d3.voronoi()
      .extent([[-1, -1], [width + 1, height + 1]]);

  var promises = [
    d3.json("/static/data/states-10m.json"),
    d3.csv("/static/data/airports.csv", airportReog),
    d3.csv("/static/data/10yrs_delay_rate.csv", flightReog)
  ]
  Promise.all(promises).then(excecute_fun)


  function excecute_fun([us, airports, flights]) {

    var AP_Extrac_Iata = d3.map(airports, d => { return d.iata; });

    flights.forEach(dd => {
      var startAir = AP_Extrac_Iata.get(dd.ORIGIN),
          endAir = AP_Extrac_Iata.get(dd.DEST),
          countByAirport = {};
      startAir.TSpack.coordinates.push([startAir, endAir]);
      endAir.TSpack.coordinates.push([endAir, startAir]);
    });

    <!-- console.log(airports) -->

    airports = airports
        .filter(d => { return d.TSpack.coordinates.length; });
	for (var i = 0; i < airports.length; i++) {
		flight_count_tmp = flights.filter(x => {
			return x.ORIGIN === airports[i].iata
		})
		<!-- flight_count.push(flight_count_tmp) -->
		sumFlight = 0
		for (var j = 0; j < flight_count_tmp.length; j++) {
			sumFlight = sumFlight + flight_count_tmp[j].FL_COUNT
		}
		<!-- console.log("sumFlight = ", sumFlight) -->
		airports[i]["flight_count"] = sumFlight
	}

	for (var i = 0; i < flights.length; i++) {
		<!-- console.log("flights[i] = ", flights[i]) -->
		sourceInfo = airports.filter(x => {return x.iata === flights[i].ORIGIN})
		targetInfo = airports.filter(x => {return x.iata === flights[i].DEST})
		var source_tmp = {0: sourceInfo[0]["0"], 1: sourceInfo[0]["1"]}
		var target_tmp = {0: targetInfo[0]["0"], 1: targetInfo[0]["1"]}
		flights[i].pathX.coordinates.push([source_tmp, target_tmp])
	}

    console.log("airports = ", airports)
    svg.append("path")
        .datum(topojson.feature(us, us.objects.land))
        .attr("class", "mainLand")
        .attr("d", Allpath);

    svg.append("path")
        .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
        .attr("class", "Borders4state")
        .attr("d", Allpath);

    svg.selectAll("circles.points")
      .data(airports)
      .enter()
      .append("circle")
      .attr("r", d => {return d.flight_count/100000})
      .attr("transform", function(d) {return "translate(" + proj([d[0],d[1]]) + ")";});


    var airport = svg.selectAll(".airport")
      .data(airports)
      .enter().append("g")
      .attr("class", "airport")
	  .on("mouseover", mouseOverFunc)
	  .on("mouseout", function(d) {d3.select("#path_id").remove()});

    airport.append("title")
        .text(d => {
			tmp = d.iata + ": " + d.flight_count + " flights"
			return tmp;
		});

    <!-- airport.append("path") -->
        <!-- .attr("class", "airport-arc") -->
        <!-- .attr("d", function(d) { return path(d.TSpack); }); -->

    airport.append("path")
        .data(Voro.polygons(airports.map(proj)))
        .attr("class", "airport_polygon")
        .attr("d", d => {
			if(d){
				combine_tmp = "M" + d.join("L") + "Z"
				return combine_tmp;
			}else {
				return null;
			}
		});

		var tile_num = 90
		var count_range = max_rate - min_rate
		var length_colorbar = 500
		var legend_num = 4
		var count_step = count_range / tile_num
		var data_reformat2 = []
		var count_tmp = [min_rate]
		pp = 0
		for (var i = 0; i < tile_num; i++) {
			data_reformat2.push({index_state: i+1, index_year: 1, theValue: pp + min_rate})
			pp = pp + count_step
		}

		for (var i = 1; i < legend_num; i++) {
			count_tmp.push(min_rate + (count_range)/(legend_num-1)*i)
		}
		<!-- console.log("count_tmp = ", count_tmp) -->
		<!-- console.log("data_reformat2 = ", data_reformat2) -->
		var tmpColor=["#0000FF"]

		var myLegend = svg.selectAll(".myLegend")
			.data(data_reformat2)
			.enter()
			.append("rect")
			.attr("class", "tile")
			.attr("x", function(d) {
				return (d.index_state - 1) * length_colorbar/tile_num + 250})
			.attr("y", 600)
			.attr("width", length_colorbar/tile_num)
			.attr("height", 21)
			.style("fill", tmpColor)
			.transition()
				.duration(900)
				.style("fill", function(d) {
					tmp_return = colorScale(d.theValue)
					return tmp_return;
				});
		var legendCount = svg.selectAll(".legendCount")
			.data(count_tmp)
			.enter().append("text")
			.text(function (d) { return d; })
			.attr("x", function(d, i) {
				<!-- console.log("i = ", i) -->
			return (i) * length_colorbar/(legend_num - 1) + 270; })
			.attr("y", 625)
			.style("text-anchor", "end")
			.style("font-weight", "bold")
			.attr("transform", "translate(-10," + (30-15) + ")");

		svg.append("text")
			.attr("x", 170)
			.attr("y", 638)
			.attr("text-anchor", "middle")
			.style("font-size", "18px")
			.style("font-size", "times new roman")
			.style("font-weight", "bold")
			.text("Delay Rate(%):");


	function mouseOverFunc(d, i) {

		<!-- console.log("mouseOut_d = ", d) -->

		flight_select = flights.filter(x => {return x.ORIGIN === d.iata})

		<!-- console.log("flight_select = ", flight_select) -->

		svg.append("g")
			.attr("id", "path_id")
			.selectAll("path")
			.data(flight_select)
			.enter()
			.append("path")
			.attr("class", "line")
			.attr("d", function(d) {
				<!-- console.log("d = ", d) -->
				return Allpath(d.pathX); })
			.style("stroke",function(d){
				<!-- console.log("d.rate = ", colorScale(d.rate)) -->
				return colorScale(d.rate);
			})
			.style("fill","none");

	}

  }

  function airportReog(xx) {
    xx[0] = +xx.longitude;
    xx[1] = +xx.latitude;
    xx.TSpack = {type: "MultiLineString", coordinates: []};
    return xx;
  }
  function flightReog(xx) {
    xx.FL_COUNT = +xx.FL_COUNT;
	xx.pathX = {type: "MultiLineString", coordinates: []};
    return xx;
  }