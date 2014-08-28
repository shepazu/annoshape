var svgns = "http://www.w3.org/2000/svg";

function init() {
  drawAnnoshape();
  window.addEventListener("hashchange", drawAnnoshape, false);
}

function drawAnnoshape() {
  var targetSelector = null;
  var svgeodatastr = "";

  var querystr = window.location.search;
  if (querystr) {
    svgeodatastr = querystr.replace("?", "");
  }

  var hash = window.location.hash;
  if ( hash.match(/svg(\([^{]*\))?\{/) ) {
    // hash is an Annoshape fragment
    svgeodatastr += ("" == svgeodatastr) ? hash.replace("#", "") : hash.replace("#", "&");
  } else {
    // hash is a traditional fragment identifier, or at least not an Annoshape fragment
    targetSelector = hash;        
  }
        
  // unload all prior instances
  var svgeodatas = document.querySelectorAll(".svgeodata");
  for (var s = 0; s < svgeodatas.length; s++) {
    svgeodatas[s].parentNode.removeChild(svgeodatas[s]);
  }

  if (svgeodatastr) {
    var allSVGs = svgeodatastr.split("&");

    for (var i = 0; i < allSVGs.length; i++) {
      var shapes = [];

      var svgParams = allSVGs[i].match(/svg(\([^{]*\))?\{/)[1];
			if (svgParams) {
	      svgParams = svgParams.substring(svgParams.indexOf("(") + 1, svgParams.lastIndexOf(")")).split(";");  
	      for (var p = 0; p < svgParams.length; p++) {
	        if (svgParams[p]) {
	          var eachParam = svgParams[p].split(":");

	          // look for target selector
	          if ("target-selector" == eachParam[0] ) {
	            targetSelector = decodeURIComponent(eachParam[1]);
	          }

	          // TODO: do other stuff with svg root params here...
	        }
	      }
			}
                  
      var shapestr = decodeURIComponent(allSVGs[i].replace(/svg(\([^{]*\))?\{/, ""));
      var allShapes = shapestr.split("}");
      // console.log("allShapes:" + allShapes)

      for (var as = 0; as < allShapes.length; as++) {
        var eachShape = allShapes[as];
        // console.log("eachShape:" + eachShape)
        if (eachShape) {
          var parts = eachShape.split("{");
          var shapetype = parts[0].split("(")[0];
          var style = parts[0].substring(parts[0].indexOf("(") + 1, parts[0].lastIndexOf(")"));

          var attrs = parts[1];
          shapes.push([shapetype, style, attrs]);
        }
      }

      var targetEl = null;
      if (targetSelector && "#" != targetSelector && "" != targetSelector) {
        targetEl = document.querySelector(targetSelector);
      } else {
        // if there's no target selector, try the first image
        targetEl = document.querySelectorAll("img")[0];
      }

      // if there's no image or target on the page, bow out gracefully
      if (!targetEl) {
        return false;
      } 
      
      // if this is the first target element, scroll it into view
      if ( 0 == i ) {
        targetEl.scrollIntoView( true );
      }

      // get target dimensions and position
      var w = targetEl.width;
      var h = targetEl.height;
      var targetOrigin = getCSSPosition(targetEl);

      /*
      var svgeodata = document.querySelector('[data-selector="' + targetSelector + '"]');
      if (svgeodata) {
        targetEl.parentNode.removeChild(svgeodata);
      }
      */

      var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
      svg.setAttribute("class", "svgeodata");
      svg.setAttribute("data-selector", targetSelector);
      svg.setAttribute("width", w);
      svg.setAttribute("height", h);
      svg.setAttribute("style", "position:absolute;left:" + targetOrigin.x + "px;right:" + targetOrigin.y + "px;");
      
      // create optional drawing canvas
      creatingDrawingCanvas(svg);

      var markerArrow, markerDot, markerMapPin = null;
      for (var sh = 0; sh < shapes.length; sh++) {
        var elType = shapes[sh][0];
        if (elType) {
          // console.log(elType)
          var elAttrs = shapes[sh][2];
          var style = shapes[sh][1];
          var shapeEl = document.createElementNS("http://www.w3.org/2000/svg", elType);

          switch (elType) {
          case "line":
          case "rect":
          case "circle":
          case "ellipse":
            var attrs = elAttrs.split(";");
            for (var a = 0; a < attrs.length; a++) {
              var eachAttr = attrs[a].split(":");
              if ("" != eachAttr) {
                shapeEl.setAttribute(eachAttr[0], eachAttr[1]);                    
              }
            }
            break;

          case "polygon":
          case "polyline":
            shapeEl.setAttribute("points", elAttrs);
            break;

          case "path":
            shapeEl.setAttribute("d", elAttrs);
            break;
          }

          var styleVal = "fill:none;stroke:black;stroke-width:3px;";

          var strokeColor = null;
          var strokeIndex = style.lastIndexOf("stroke:");
          if (-1 != strokeIndex) {
            strokeColor = style.substring(strokeIndex).split(/[:;]/)[1];
          }

          if (style) {
            var styles = style.split(";");

            for (var st = 0; st < styles.length; st++) {
              var eachStyle = styles[st].split(":");
              // // console.log(eachStyle[0] + ", " + eachStyle[1]);

              // check for default markers
              if (eachStyle[0]) {
                styleVal += eachStyle[0] + ":" + eachStyle[1] + ";";

                if (-1 != eachStyle[1].indexOf("svgeodata-arrow")) {
                  markerArrow = "black";
                  if (strokeColor) {
                    markerArrow = strokeColor;
                  }
                } else if (-1 != eachStyle[1].indexOf("svgeodata-dot")) {
                  markerDot = "black";
                  if (strokeColor) {
                    markerDot = strokeColor;
                  }
                } else if (-1 != eachStyle[1].indexOf("annoshape-mappin")) {
                  markerMapPin = "black";
                  if (strokeColor) {
                    markerMapPin = strokeColor;
                  }
                }
              }
            }
          }
          shapeEl.setAttribute("style", styleVal);

          svg.appendChild(shapeEl);
        }
      }

      // add default markers, if used in declaration
      if (markerArrow || markerDot || markerMapPin) {
        if (markerArrow) {
          var marker = document.createElementNS("http://www.w3.org/2000/svg", 'marker');
          marker.setAttribute("id", "annoshape-arrow");
          marker.setAttribute("viewBox", "-13 -6 37.5 30");
          marker.setAttribute("markerUnits", "strokeWidth");
          marker.setAttribute("refX", "-4");
          marker.setAttribute("refY", "0");
          marker.setAttribute("markerWidth", "10");
          marker.setAttribute("markerHeight", "20");
          marker.setAttribute("orient", "auto");

          var markerShape = document.createElementNS("http://www.w3.org/2000/svg", 'path');
          markerShape.setAttribute("d", "M-10,-5,L0,0,-10,5Z");
          markerShape.setAttribute("style", "stroke-linejoin:round; stroke-linecap:round; fill:" + markerArrow + "; stroke:" + markerArrow + ";");
          marker.appendChild(markerShape);
          svg.appendChild(marker);
        }

        if (markerDot) {
          var marker = document.createElementNS("http://www.w3.org/2000/svg", 'marker');
          marker.setAttribute("id", "annoshape-dot");
          marker.setAttribute("viewBox", "-3 -3 6 6");
          marker.setAttribute("markerUnits", "strokeWidth");
          marker.setAttribute("refX", "0");
          marker.setAttribute("refY", "0");
          marker.setAttribute("markerWidth", "3");
          marker.setAttribute("markerHeight", "3");

          var markerShape = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
          markerShape.setAttribute("r", "3");
          markerShape.setAttribute("style", "stroke:none; fill:" + markerDot + ";");
          marker.appendChild(markerShape);
          svg.appendChild(marker);
        }

        if (markerMapPin) {

          var marker = document.createElementNS("http://www.w3.org/2000/svg", 'marker');
          marker.setAttribute("id", "annoshape-mappin");
          marker.setAttribute("viewBox", "-13 -6 37.5 30");
          marker.setAttribute("markerUnits", "strokeWidth");
          marker.setAttribute("refX", "0");
          marker.setAttribute("refY", "0");
          marker.setAttribute("markerWidth", "10");
          marker.setAttribute("markerHeight", "20");

          var markerShape = document.createElementNS("http://www.w3.org/2000/svg", 'path');
          markerShape.setAttribute("d", "M0,0,L-5.66,-15,A6.25,6.75,0,1,1,5.66,-15ZM0,-20,A2,2,0,1,0,0,-16,A2,2,0,0,0,0,-20Z");
          markerShape.setAttribute("style", "stroke:whitesmoke;stroke-width:1px;stroke-linejoin:round;fill:" + markerMapPin + ";");
          marker.appendChild(markerShape);
          svg.appendChild(marker);
        }
      }

      targetEl.parentNode.insertBefore(svg, targetEl.nextSibling);
    }
  }
}

function getCSSPosition(el) {
  var x = 0;
  var y = 0;
  while (true) {
    x += el.offsetLeft;
    y += el.offsetTop;
    if (null === el.offsetParent) {
      break;
    }
    el = el.offsetParent;
  }
  return {
    "x": x,
    "y": y
  };
}


/************************
// Drawing functionality
************************/
function creatingDrawingCanvas( root ) {
  // create drawing canvas
  var bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "none");
  bg.setAttribute("pointer-events", "all");
  bg.addEventListener("click", drawPoint, false);
  root.appendChild(bg);
}

function drawPoint(evt) {
  var root = evt.target.parentNode;
  if (root) {
    var pt = root.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    var coords = pt.matrixTransform(evt.target.getScreenCTM().inverse());
    coords.x = parseInt(coords.x);
    coords.y = parseInt(coords.y);

    var dot = document.createElementNS(svgns, "circle");
    dot.setAttribute("class", "annoshape");
    dot.setAttribute("cx", coords.x);
    dot.setAttribute("cy", coords.y);
    dot.setAttribute("r", "2");
    dot.setAttribute("fill", "red");
    dot.setAttribute("stroke", "gold");
    root.appendChild(dot);

    var poly = root.querySelector("polyline.annoshape");
    // console.log(poly)
    if (!poly) {
      // create drawing poly
      poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      poly.setAttribute("class", "annoshape");
      poly.setAttribute("points", coords.x + "," + coords.y);
      poly.setAttribute("style", "fill:whitesmoke;fill-opacity:0.3;stroke:gold;stroke-width:1px;");
      poly.setAttribute("pointer-events", "none");
      root.appendChild(poly);

      // set initial dot as "close point"
      dot.setAttribute("r", "4");
      dot.addEventListener("click", endShape, false);
    } else {
      var points = poly.getAttribute("points");
      points += "," + coords.x + "," + coords.y;
      poly.setAttribute("points", points);
    }
  }
}


function endShape(evt) {
  var root = evt.target.parentNode;
  var dots = root.querySelectorAll("circle.annoshape");
  for (var d = 0; d < dots.length; d++) {
    root.removeChild(dots[d]);
  }
        
  var poly = root.querySelector("polyline.annoshape");
  poly.setAttribute("class", "");
  
  
  // create new link to drawn polyline
  var selector = root.getAttribute("data-selector");
  var points = poly.getAttribute("points");
  
  
  var list = root.parentNode.querySelector("ul");
  var li = createLi("New Annoshape URL: ");
  li.setAttribute("style", "color:red;");

  // create sublist
  var ul = document.createElement("ul");
  li.appendChild(ul);
  
  // insert polyline link
  var polylineUrl = "#svg(target-selector:" + encodeURIComponent(selector) + "){polyline(stroke:gold;){" + points + "}}";
  var liline = createLi("as polyline: ", polylineUrl);
  ul.appendChild(liline);

  // insert polygon link
  var polygonUrl = "#svg(target-selector:" + encodeURIComponent(selector) + "){polygon(stroke:blue;fill:whitesmoke;fill-opacity:0.3){" + points + "}}";
  var ligon = createLi("as polygon: ", polygonUrl);
  ul.appendChild(ligon);

  list.appendChild(li);
}


function createLi(label, url) {
  var li = document.createElement("li");
  var b = document.createElement("b");
  b.appendChild(document.createTextNode(label));
  li.appendChild(b);

  if (url) {
    var a = document.createElement("a");
    a.setAttribute("href", url);
    a.appendChild(document.createTextNode(url));
    li.appendChild(a);
  }
  
  return li;
}


function svg2svgeo(el) {
  var str = null;
  if (1 == el.nodeType) { // element
    str = el.localName + "{";
    for (var i = 0; i < elem.attributes.length; i++) {
      var attrib = elem.attributes[i];
      if (attrib.specified) {
        str += attrib.name + ":" + attrib.value + ";";
      }
    }
    str += "}";
  }
  return str;
}

