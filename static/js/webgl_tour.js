var gl, weights = [[], []];

function init_webgl_tour(data, colorScale)
{
    if (!gl) {
        gl = Lux.init({
            clearColor: [0,0,0,0],
            highDPS: false
        });
    }
    
    var attributeBuffers = [];
    var axis1Parameters = weights[0], axis2Parameters = weights[1];
    
    // artifically limit projection size to not run into WebGL limitations
    var projectionSize = 8; /* data[0].curve.length; */
    var columnMin, columnMax, columnCenter = [];
    var xyExpression = Shade.vec(0, 0),
        xyCenter = Shade.vec(0, 0),
        xyDistance = Shade.vec(0, 0);
   
    for (var i=0; i<projectionSize; ++i) {
        var thisColumnLst = data.map(function(row) { return row.curve[i]; });
        var thisColumn = Lux.attributeBuffer({
            vertexArray: thisColumnLst,
            itemSize: 1 });
        attributeBuffers.push(thisColumn);
        axis1Parameters.push(Shade.parameter("float"));
        axis2Parameters.push(Shade.parameter("float"));
        var axes = Shade.vec(axis1Parameters[i], axis2Parameters[i]);
        columnMin = _.min(thisColumnLst);
        columnMax = _.max(thisColumnLst);
        columnCenter = (columnMax + columnMin) / 2;
        xyExpression = xyExpression.add(axes.mul(thisColumn));
        xyCenter = xyCenter.add(axes.mul(columnCenter));
        xyDistance = xyDistance.add(axes.mul(columnCenter - columnMin).abs());
    }

    var indexMap = _.object(colorScale.domain(),
			    _.range(colorScale.domain().length));
    var colorMapFromIndex = colorScale.range().map(function(c) {
	return Shade.color(c, 0.3);
    });
    
    var typeAttributeBuffer = Lux.attributeBuffer({
        vertexArray: data.map(function(row) {
	    return indexMap[row.type];
	}),
        itemSize: 1, keepArray: true });

    // Lux ordinal scales do not support a custom domain,
    // and need to be ordered.
    var fillColor = Lux.Shade.Scale.ordinal({
        range: colorMapFromIndex
    });

    var c = fillColor(typeAttributeBuffer);
   
    Lux.Scene.add(Lux.Marks.scatterplot({
        elements: attributeBuffers[0].numItems,
        xy: xyExpression,
        xyScale: Shade.Scale.linear({
            domain: [xyCenter.sub(xyDistance),
                     xyCenter.add(xyDistance)],
            range: [Shade.vec(0,0), Shade.vec(1,1)]}),
        fillColor: c,
        strokeColor: c,
        pointDiameter: 7.0,
        mode: Lux.DrawingMode.over
    }));

    function random2dFrame(dimension)
    {
        var v1 = [], v2 = [];
        var l1 = 0, l2 = 0;
        for (var i=0; i<dimension; ++i) {
            v1[i] = Math.random() * 2 - 1;
            v2[i] = Math.random() * 2 - 1;
            l1 += v1[i] * v1[i];
            l2 += v2[i] * v2[i];
        }
        l1 = Math.sqrt(l1);
        l2 = Math.sqrt(l2);
        // exceedingly unlikely; just try again.
        if (l1 === 0 || l2 === 0)
            return random2dFrame(dimension);
        var d = 0;
        for (i=0; i<dimension; ++i) {
            v1[i] /= l1;
            v2[i] /= l2;
            d += v1[i] * v2[i];
        }
        var l = 0;
        for (i=0; i<dimension; ++i) {
            v2[i] = v2[i] - d * v1[i];
            l += v2[i] * v2[i];
        }
        l = Math.sqrt(l);
        // exceedingly unlikely; just try again.
        if (l === 0)
            return random2dFrame(dimension);
        for (i=0; i<dimension; ++i) {
            v2[i] /= l;
        }
            return [v1, v2];
    }
    var frame1 = random2dFrame(projectionSize);
    var frame2 = random2dFrame(projectionSize);
    var start = new Date().getTime();
    var prevU = 1;

    Lux.Scene.animate(function () {
        var elapsed = (new Date().getTime() - start) / 1000;
        var u = elapsed/3;
        u -= Math.floor(u);
        if (u < prevU) {
            frame1 = frame2;
            frame2 = random2dFrame(projectionSize);
        }
        prevU = u;
        for (var i=0; i<projectionSize; ++i) {
            axis1Parameters[i].set(u*frame2[0][i] + (1-u) * frame1[0][i]);
            axis2Parameters[i].set(u*frame2[1][i] + (1-u) * frame1[1][i]);
        }
    });
}
