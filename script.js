var bayes = function(alpha_a,alpha_b,beta_a,beta_b,visitors_a,conversions_a,visitors_b,conversions_b) {

  var init = function() {
    var credMass = .95;
    var sample = 100000;

    var alpha_a_hat = alpha_a + conversions_a;
    var alpha_b_hat = alpha_b + conversions_b;
    var beta_a_hat = beta_a + visitors_a - conversions_a;
    var beta_b_hat = beta_b + visitors_b - conversions_b; 

    var samples_a = createSamples(alpha_a_hat,beta_a_hat,sample);
    var samples_b = createSamples(alpha_b_hat,beta_b_hat,sample)
    var samples_b_a = createSamplesDiff(samples_a,samples_b,sample);

    var probability_b_a = createProbability(samples_b_a);
    var probability_a_b = (100-probability_b_a).toFixed(2);

    var HDI_a = HDIofDiff(samples_a,credMass);
    var HDI_b = HDIofDiff(samples_b,credMass);
    var HDI_b_a = HDIofDiff(samples_b_a,credMass);

    console.log(probability_b_a,probability_a_b,HDI_a,HDI_b,HDI_b_a);
    updateMarkup(probability_b_a,probability_a_b,HDI_a,HDI_b,HDI_b_a);
  }

  var updateMarkup = function(probability_b_a,probability_a_b,HDI_a,HDI_b,HDI_b_a) {
    $('#bayes-results').removeClass('hide');
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
      positive_samples[positive_samples.length] = (samples[i] > 0) ? 1 : 0;
    }
    var total = positive_samples.reduce(function(a, b) {
      return a + b;
    });
    var probability = ((total/(positive_samples.length))*100).toFixed(2);
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
    var HDImin = sortedSample[minimum].toFixed(4);
    var HDImax = sortedSample[minimum+ciIdxInc].toFixed(4);
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
});

