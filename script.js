var bayes = function(alpha_a,alpha_b,beta_a,beta_b,visitors_a,conversions_a,visitors_b,conversions_b) {

  var init = function() {
    var credMass = .95;
    var sample = 100000;

    var alpha_a_hat = alpha_a + conversions_a;
    var alpha_b_hat = alpha_b + conversions_b;
    var beta_a_hat = beta_a + (visitors_a - conversions_a);
    var beta_b_hat = beta_b + (visitors_b - conversions_b); 

    var samples_a = createSamples(alpha_a_hat,beta_a_hat,sample);
    var samples_b = createSamples(alpha_b_hat,beta_b_hat,sample)
    var samples_b_a = createSamplesDiff(samples_a,samples_b,sample);

    var probability_b_a = createProbability(samples_b_a);
    var probability_a_b = (100-probability_b_a);

    var HDI_a = HDIofDiff(samples_a,credMass);
    var HDI_b = HDIofDiff(samples_b,credMass);
    var HDI_b_a = HDIofDiff(samples_b_a,credMass);

    updateMarkup(probability_b_a,probability_a_b,HDI_a,HDI_b,HDI_b_a);
    loadCharts(samples_a,samples_b,samples_b_a);
  }
  var loadCharts = function(a,b,b_a) {
    $('#bayes-graphs').removeClass('hide');
    var cl_a = cleanData(a,'a');
    var cl_b = cleanData(b,'b');
    var cl_b_a = cleanData(b_a,'b-a');
    var bounds = calculateBounds(cl_a,cl_b,cl_b_a);
    var diff = calculateMaxDiff(cl_a['data'],cl_b['data'],cl_b_a['data']);
    var offsets = calculateOffsets(cl_a['data'],cl_b['data'],cl_b_a['data'],diff);

    function draw() {
      $('#chart-content .chart').empty();
      var contentSize = $('#bayes-graphs card-content').width();
      var intervalSize = 6;
      var contentHeight = 320;
      var marginSize = 24;
      var x = d3.scale.linear()
      .domain([bounds['minX'], bounds['maxX']])
      .range([0, contentSize]);
      var y = d3.scale.linear()
        .domain([bounds['minY'], bounds['maxY']])
        .range([0, contentHeight]);

      var chart = d3.select('#chart-content .chart')
        .attr('width',$('#bayes-graphs .card-content').width()-marginSize)
        .attr('height',contentHeight+marginSize)

      var bar_a = chart.selectAll('.a')
        .data(cl_a['data'])
        .enter().append('g')
        .attr('class',cl_a['type'])
        .attr('transform',function(d, i) { return 'translate('+(i*intervalSize)+',0)'; });
      bar_a.append('rect')
        .attr('class',cl_a['type'])
        .attr('y',function(d) { return contentHeight - y(d.y); })
        .attr('x',function() {return offsets['a'];})
        .attr('height',function(d) { return y(d.y); })
        .attr('width',function(d) { return 3; });

      var bar_b = chart.selectAll('.b')
        .data(cl_b['data'])
        .enter().append('g')
        .attr('class',cl_b['type'])
        .attr('transform',function(d, i) { return 'translate('+(i*intervalSize)+',0)'; });
      bar_b.append('rect')
        .attr('class',cl_b['type'])
        .attr('y',function(d) { return contentHeight - y(d.y); })
        .attr('x',function() {return offsets['b'];})
        .attr('height',function(d) { return y(d.y); })
        .attr('width',function(d) { return 3; });

      var bar_b_a = chart.selectAll('.b_a')
        .data(cl_b_a['data'])
        .enter().append('g')
        .attr('class',cl_b_a['type'])
        .attr('transform',function(d, i) { return 'translate('+(i*intervalSize)+',0)'; });
      bar_b_a.append('rect')
        .attr('class',cl_b_a['type'])
        .attr('y',function(d) { return contentHeight - y(d.y); })
        .attr('x',function() {return offsets['b_a'];})
        .attr('height',function(d) { return y(d.y); })
        .attr('width',function(d) { return intervalSize-1; });
    }
    draw();
    $(window).on('resize',function() {
      draw();
    });
  }

  var cleanData = function(data,type) {
    var clean = {'type':type,
                  'data':[]};

    for(var i=0;i<data.length;i++) {
      data[i] = data[i].toFixed(5);
    }
    data = data.sort(function(a,b) {
      return a-b;
    });

    var prev;
    var cleanedData = [];
    for(var i=0;i<data.length;i++) {
      if(data[i] !== prev) {
        clean['data'][clean['data'].length] = {'x':data[i],'y':1};
      } else {
        clean['data'][clean['data'].length-1]['y']+=1;
      }
      prev = data[i];
    }
    
    return clean;
  }

  var calculateBounds = function(a,b,c) {
    var minX = Math.min(a['data'][0]['x'],b['data'][0]['x'],c['data'][0]['x']);
    var minY = 0;
    var maxX = Math.max(a['data'][a['data'].length-1]['x'],b['data'][b['data'].length-1]['x'],c['data'][c['data'].length-1]['x']);
    var maxY_a = getMaxFromSet(a);
    var maxY_b = getMaxFromSet(b);
    var maxY_c = getMaxFromSet(c);
    var maxY = Math.max(maxY_a,maxY_b,maxY_c);
    return {'minX':minX,'minY':minY,'maxX':maxX,'maxY':maxY};
  }

  var calculateMaxDiff = function(a,b,c) {
    var min;
    var max;
    var minX = Math.min(a[0]['x'],b[0]['x'],c[0]['x']);
    if(minX === a[0]['x']) {
      min = 'a';
    } else if(minX === b[0]['x']) {
      min = 'b';
    } else {
      min = 'b_a';
    }
    var maxX = Math.max(a[a.length-1]['x'],b[b.length-1]['x'],c[c.length-1]['x']);
    if(maxX === a[a.length-1]['x']) {
      max = 'a';
    } else if(maxX === b[b.length-1]['x']) {
      max = 'b';
    } else {
      max = 'b_a';
    }
    return {'min':min,'max':max};
  }

  var calculateOffsets = function(a,b,c,diff) {
    var offsetA = 0;
    var offsetB = 0;
    var offsetC = 0;
    if(diff['min'] === 'a') {
      for(var i=0;i<a.length;i++) {
        if(a[i]['x'] < b[0]['x']) {
          offsetB++;
        }
        if(a[i]['x'] < c[0]['x']) {
          offsetC++;
        }
      }
    } else if(diff['min'] === 'b') {
      for(var i=0;i<b.length;i++) {
        if(b[i]['x'] < a[0]['x']) {
          offsetA++;
        }
        if(b[i]['x'] < c[0]['x']) {
          offsetC++;
        }
      }
    } else {
      for(var i=0;i<c.length;i++) {
        if(c[i]['x'] < a[0]['x']) {
          offsetA++;
        }
        if(c[i]['x'] < b[0]['x']) {
          offsetB++;
        }
      }
    }
    return {'a':offsetA,'b':offsetB,'b_a':offsetC};
  }

  var getMaxFromSet = function(data) {
    var max = 0;
    for(var i=0;i<data['data'].length;i++) {
      if(data['data'][i]['y'] > max) {
        max = data['data'][i]['y'];
      }
    }
    return max;
  }

  var createChartSpinner = function() {
    var $markup = $('<div id="chart-content" class="center-align">\
                      <div class="preloader-wrapper big active">\
                        <div class="spinner-layer spinner-blue-only">\
                          <div class="circle-clipper left">\
                            <div class="circle"></div>\
                          </div><div class="gap-patch">\
                            <div class="circle"></div>\
                          </div><div class="circle-clipper right">\
                            <div class="circle"></div>\
                          </div>\
                        </div>\
                      </div>\
                      <svg class="chart"></svg>\
                    </div>');
    return $markup;
  }

  var updateMarkup = function(probability_b_a,probability_a_b,HDI_a,HDI_b,HDI_b_a) {
    $('#bayes-results').removeClass('hide');
    $('#hide-button').removeClass('hide');
    $('#probability-b-a .value').text(probability_b_a+'%');
    $('#probability-a-b .value').text(probability_a_b+'%');

    $('#hdi-a .value-min').text(HDI_a['HDImin']);
    $('#hdi-a .value-max').text(HDI_a['HDImax']);

    $('#hdi-b .value-min').text(HDI_b['HDImin']);
    $('#hdi-b .value-max').text(HDI_b['HDImax']);

    $('#hdi-b-a .value-min').text(HDI_b_a['HDImin']);
    $('#hdi-b-a .value-max').text(HDI_b_a['HDImax']);

  }

  var createSamples = function(alpha_hat,beta_hat,sample) {
    var samples = [];
    for(var i=0;i<sample;i++) {
      var beta_dist = jStat.beta.sample(alpha_hat,beta_hat);
      samples[i] = beta_dist;
    }
    return samples;
  }

  var createSamplesDiff = function(samples_a,samples_b,sample) {
    var samples_diff = [];
    for(var i=0;i<sample;i++) {
      samples_diff[i] = samples_b[i]-samples_a[i];
    }
    return samples_diff;
  }

  var createProbability = function(samples) {
    var positive_samples = [];
    for(var i=0;i<samples.length;i++) {
      if(samples[i] > 0) {
        positive_samples[positive_samples.length] = 1;
      } else {
        positive_samples[positive_samples.length] = 0;
      }
    }
    var total = positive_samples.reduce(function(a, b) {
      return a + b;
    });
    console.log(total,positive_samples.length);
    var probability = ((total/(positive_samples.length))*100);
    return probability;
  }

  var HDIofICDF = function(beta,credMass,alpha_hat,beta_hat) {
    var incredMass = 1-credMass;
  }

  var HDIofDiff = function(samples,credMass) {
    var sortedSample = samples.sort(function(a,b) {
      return a-b;
    });
    var ciIdxInc = Math.floor(credMass * sortedSample.length);
    var nCIs = sortedSample.length - ciIdxInc;
    var ciWidth = [];
    for(var i=0;i<nCIs;i++) {
      var cc = sortedSample[i+ciIdxInc] - sortedSample[i];
      ciWidth[i] = cc;
    }
    
    var minimum = indexOfSmallest(ciWidth);
    var HDImin = sortedSample[minimum];
    var HDImax = sortedSample[minimum+ciIdxInc];
    return {'HDImin':HDImin,'HDImax':HDImax};
  }

  var indexOfSmallest = function(a) {
   return a.indexOf(Math.min.apply(Math, a));
  }
  return {
    init:init
  }
};

$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

$(function() {
  $('#bayes-form').on('submit', function(e) {
    e.preventDefault();
    var $form = $(this);
    var data = $form.serializeObject();
    bayes(data['alpha_a'],
          data['alpha_b'],
          data['beta_a'],
          data['beta_b'],
          data['visitors_a'],
          data['conversions_a'],
          data['visitors_b'],
          data['conversions_b']).init();
  });

  $('#hide-button').on('click', function(e) {
    e.preventDefault();
    $(this).addClass('hide');
    $('#bayes-graphs, #bayes-results').addClass('hide');
    $('#visitors_a, #conversions_a, #visitors_b, #conversions_b').val('').removeClass('valid');
  });

  $(document).on('click','#a-toggle',function(e) {
    e.preventDefault();
    var $a = $('g.a');
    if($a.eq(0).attr('class').indexOf('hide') > -1) {
      $a.attr('class','a');  
    } else {
      $a.attr('class','a hide');  
    }
    $(this).find('i').toggleClass('grey-text pink-text');
  });
  $(document).on('click','#b-toggle',function(e) {
    e.preventDefault();
    var $b = $('g.b');
    if($b.eq(0).attr('class').indexOf('hide') > -1) {
      $b.attr('class','b');  
    } else {
      $b.attr('class','b hide');  
    }
    $(this).find('i').toggleClass('grey-text blue-text');
  });
  $(document).on('click','#b_a-toggle',function(e) {
    e.preventDefault();
    var $b_a = $('g.b-a');
    if($b_a.eq(0).attr('class').indexOf('hide') > -1) {
      $b_a.attr('class','b-a');  
    } else {
      $b_a.attr('class','b-a hide');  
    }
    $(this).find('i').toggleClass('grey-text yellow-text');
  });
});
