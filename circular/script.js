"use strict";

// Wrap everything in an anonymous function to avoid poluting the global namespace
(function () {
  // Event handlers for filter change
  let unregisterHandlerFunctions = [];

  let worksheet1, worksheet2;
  // Use the jQuery document ready signal to know when everything has been initialized
  $(document).ready(function () {
    // Initialize tableau extension
    tableau.extensions.initializeAsync().then(function () {
      // Get worksheets from tableau dashboard
      worksheet1 = tableau.extensions.dashboardContent.dashboard.worksheets[0];
      worksheet2 = tableau.extensions.dashboardContent.dashboard.worksheets[1];

      function getDataAndPlotChart() {
        // load data from worksheet
        let dataArr = [];
        worksheet1.getSummaryDataAsync().then((data) => {
          console.log(data);
          let dataJson;
          
          data.data.map((d) => {
            dataJson = {};
            dataJson[data.columns[0].fieldName] = d[0].value; //1st column
            dataJson[data.columns[1].fieldName] = d[1].value; //2nd column
            // dataJson[data.columns[2].fieldName] = d[2].value; //3rd column
            // dataJson[data.columns[3].fieldName] = d[3].value; //4th column
            dataArr.push(dataJson);
          });

          plotChart(dataArr);
        });
      }

      getDataAndPlotChart();

      // event listener for filters
      let unregisterHandlerFunction = worksheet1.addEventListener(
        tableau.TableauEventType.FilterChanged,
        filterChangedHandler
      );
      unregisterHandlerFunctions.push(unregisterHandlerFunction);

      function filterChangedHandler(event) {
        // for filter change
        // Add fieldName with (||) for other filters
        if (event.fieldName === "Segment Name") {
          // reload summary data
          getDataAndPlotChart();
        }
      }
    });
  });

  function sum(arr) {
    let count = 0;
    arr.forEach((element) => {
      count += parseInt(element["CNT(data-unspsc-codes.csv)"]);
    });
    return count;
  }

  // ========================== D3 CHART ===================== //
  function plotChart(data) {
    // set the dimensions and margins of the graph
    const margin = { top: 100, right: 0, bottom: 0, left: 0 },
      width = 460 - margin.left - margin.right,
      height = 460 - margin.top - margin.bottom,
      innerRadius = 90,
      outerRadius = Math.min(width, height) / 2; // the outerRadius goes from the middle of the SVG area to the border

    // append the svg object
    const svg = d3
      .select("body")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr(
        "transform",
        `translate(${width / 2 + margin.left}, ${height / 2 + margin.top})`
      );

    // X scale: common for 2 data series
    const x = d3
      .scaleBand()
      .range([0, 2 * Math.PI]) // X axis goes from 0 to 2pi = all around the circle. If I stop at 1Pi, it will be around a half circle
      .align(0) // This does nothing
      .domain(data.map((d) => d.Country)); // The domain of the X axis is the list of states.

    // Y scale outer variable
    const y = d3
      .scaleRadial()
      .range([innerRadius, outerRadius]) // Domain will be define later.
      .domain([0, 13000]); // Domain of Y is from 0 to the max seen in the data

    // Second barplot Scales
    const ybis = d3
      .scaleRadial()
      .range([innerRadius, 5]) // Domain will be defined later.
      .domain([0, 13000]);

    // Add the bars
    svg
      .append("g")
      .selectAll("path")
      .data(data)
      .join("path")
      .attr("fill", "#69b3a2")
      .attr("class", "yo")
      .attr(
        "d",
        d3
          .arc() // imagine your doing a part of a donut plot
          .innerRadius(innerRadius)
          .outerRadius((d) => y(d["Value"]))
          .startAngle((d) => x(d.Country))
          .endAngle((d) => x(d.Country) + x.bandwidth())
          .padAngle(0.01)
          .padRadius(innerRadius)
      );

    // Add the labels
    svg
      .append("g")
      .selectAll("g")
      .data(data)
      .join("g")
      .attr("text-anchor", function (d) {
        return (x(d.Country) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) <
          Math.PI
          ? "end"
          : "start";
      })
      .attr("transform", function (d) {
        return (
          "rotate(" +
          (((x(d.Country) + x.bandwidth() / 2) * 180) / Math.PI - 90) +
          ")" +
          "translate(" +
          (y(d["Value"]) + 10) +
          ",0)"
        );
      })
      .append("text")
      .text((d) => d.Country)
      .attr("transform", function (d) {
        return (x(d.Country) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) <
          Math.PI
          ? "rotate(180)"
          : "rotate(0)";
      })
      .style("font-size", "11px")
      .attr("alignment-baseline", "middle");

    // Add the second series
    svg
      .append("g")
      .selectAll("path")
      .data(data)
      .join("path")
      .attr("fill", "red")
      .attr(
        "d",
        d3
          .arc() // imagine your doing a part of a donut plot
          .innerRadius((d) => ybis(0))
          .outerRadius((d) => ybis(d["Value"]))
          .startAngle((d) => x(d.Country))
          .endAngle((d) => x(d.Country) + x.bandwidth())
          .padAngle(0.01)
          .padRadius(innerRadius)
      );
  }
})();
