define(['ractive', 'client', 'logger', 'moment', 'underscore'], function(ractive, client, logger, moment, _) {

    var ws;

    var apiDateFormat = 'YYYY-MM-DDTHH:mm:ss.SSSSSSZ';

    ractive.on({
	'seek-asciinema': function( ctx, time ) {
	    var ts = moment(time, apiDateFormat);
	    cast_divs = ractive.findAll('.test-asciicast');
	    cast_divs.forEach(function(cast_div) {
		var n = ractive.getContext(cast_div);
		asciinemaPlayerSeek(n, ts);
	    });
	},
	'open-subtests': function( ctx ) {
	    // like bootstrap Util.getSelectorFromElement
	    selector = ctx.node.getAttribute('data-target');
	    if (!selector || selector === '#') {
		selector = ctx.node.getAttribute('href') || '';
	    }
	    // Apply selector state to subtest
	    if ($(selector).hasClass('show')) {
		$(selector + ' .collapse' ).collapse('hide');
	    } else {
		$(selector + ' .collapse' ).collapse('show');
	    }
	},
	'switch-margins': function( ctx ) {
	    margin_selector = ctx.node.getAttribute('margin-target');
	    selector = ctx.node.getAttribute('data-target');
	    if (!selector || selector === '#') {
		selector = ctx.node.getAttribute('href') || '';
	    }
	    source_selector = ctx.node.getAttribute('margin-source');
	    if (source_selector === selector) {
		// Apply selector depending on original selector state
		if ($(selector).hasClass('show')) {
		    $(margin_selector).removeClass('no-margin');
		} else {
		    $(margin_selector).addClass('no-margin');
		}
	    } else {
		// Apply selector depending on source_selector state
		if ($(source_selector).hasClass('show')) {
		    $(margin_selector).addClass('no-margin');
		} else {
		    $(margin_selector).removeClass('no-margin');
		}
	    }
	}
    });

    function initialize(params) {
	logger.info('Run :: initialize');
	var run = {
	    testCount: 0,
	    testSkipCount: 0,
	    testPassCount: 0,
	    testFailCount: 0,
	    errorlist: [],
	    packages: [],
	    packageMap: new Map(),
	    pkgsummary: params.summary,
	    asciicastURL: params.asciicast,
	};

	if (params.live) {
	    ractive.set('name', ' Live!');
	    document.title = 'Live - GoTestWeb';
	    ws = new WebSocket("ws://" + location.host + "/live");
	    ws.onmessage = function(event) {
		event.data.split('\n').forEach(function(line) {
		    if (line != '') {
			try {
			    var testevent=JSON.parse(line);
			    addTestEvent(run, testevent);
			} catch(e) {
			    if (e instanceof SyntaxError) {
				run.errorlist.push({line:line});
			    }
			}
		    }
		});
		var content = $("html, body")[0];
		var isScrolledToBottom = content.scrollHeight - content.clientHeight <= content.scrollTop + 1;
		//console.log(content);
		ractive.set('run', run);
		var isStillScrolledToBottom = content.scrollHeight - content.clientHeight <= content.scrollTop + 1;
		//console.log("isScrolledToBottom:"+isScrolledToBottom+" still:"+isStillScrolledToBottom);
		if (isScrolledToBottom && !isStillScrolledToBottom) {
		    $("html, body").animate({ scrollTop: $(document).height() }, 400);
		}
	    };
	    ractive.set('run', run);
	    console.log("Live!");
	} else if (params.file !== '') {
	    ractive.set('name', params.file);
	    document.title = params.file + ' - GoTestWeb';
	    client.http({
		path: params.file,
		method: 'GET',
		error: function (error) {
		    err = "Unable to fetch test events from file " + params.file;
                    run.errorlist.push({line:err});
		    ractive.set('run', run);
		    console.log(err);
		},
		success: function(testevents) {

		    testevents.split('\n').forEach(function(line) {
			if (line != '') {
			    try {
				var testevent=JSON.parse(line);
				addTestEvent(run, testevent);
			    } catch(e) {
				if (e instanceof SyntaxError) {
				    run.errorlist.push({line:line});
				}
			    }
			}
		    });

		    ractive.set('run', run);
		    console.log(run);
		}
	    });

	} else {
	    ractive.set('name', ' Error!');
	    document.title = 'GoTestWeb';
	    err = "Unable to fetch test events: 'file' or 'live' required!";
	    run.errorlist.push({line:err});
	    ractive.set('run', run);
	    console.log(err);
	}
    }

    function TestPackage(name) {
	this.package = name;
	this.testMap = new Map();
	this.tests = [];
    }
    TestPackage.prototype.TestFromPath = function(path) {
	var test = this.tests[path[0]];
	path.slice(1).forEach(function(i) {
	    test = test.groupEmbed[i];
	});
	return test;
    };

    function addTestEvent(run, testevent) {
	// Treat event not related to any package like errors
	if (!testevent.hasOwnProperty('Package') || testevent.Package == ""){
	    if (testevent.hasOwnProperty('Output'))run.errorlist.push({line:testevent.Output.trim()});
	    return;
	}
	var pkg;
	if (!run.packageMap.has(testevent.Package)) {
	    pkg = new TestPackage(testevent.Package);
	    var pi = run.packages.push(pkg) - 1;
	    run.packageMap.set(testevent.Package, pi);
	    if (run.pkgsummary) {
		var testSummary = {
		    type: "TestSummary",
		    name: "Package Summary",
		    groupEmbed: [],
		    asciicasts: [],
		};
		testSummary.startDateRaw = testevent.Time;
		testSummary.startDate = dateFormatStd(testevent.Time);
		pkg.tests.push(testSummary);
	    }
	} else {
	    pkg = run.packages[run.packageMap.get(testevent.Package)];
	}
	var test;
	// Process event not related to a specific test as package summary
	if (!testevent.hasOwnProperty('Test') || testevent.Test == ""){
	    if (!run.pkgsummary) return;
	    // get summary (index 0 for draft)
	    test = pkg.tests[0];
	    switch (testevent.Action) {
		case "pass":
		    test.endDate = dateFormatStd(testevent.Time);
		    test.status = "PASS";
		    test.opencollapsed = true;
		    break;
		case "fail":
		    test.endDate = testevent.Time;
		    test.status = "FAIL";
		    test.opencollapsed = true;
		    break;
		case "output":
		    var embed = {
			type:   "Output",
			time:   testevent.Time,
			output: testevent.Output,
		    };
		    if (testevent.Output.length > 160) {
			test.hasLongContent = true;
		    }

		    // Parse Package Summary
		    var summaryRE = RegExp('(.*)\t(.*)\t(.*)\n');
		    var m = summaryRE.exec(testevent.Output);
		    if (m) {
			test.summaryDetail = m[3];
		    }

		    // Add the output to a group
		    var i = test.groupEmbed.length - 1;
		    if ((i < 0) || (test.groupEmbed[i].type !== "OutputGroup")) {
			outputGroup = { type:"OutputGroup", outputs:[] };
			i = test.groupEmbed.push(outputGroup)-1;
		    }
		    test.groupEmbed[i].outputs.push(embed);
		    break;
		case "skip":
		    test.endDate = dateFormatStd(testevent.Time);
		    test.status = "SKIP";
		    test.opencollapsed = true;
		    if (path.length == 1) run.testSkipCount++;
		    break;
		case "pause":
		case "cont":
		    // TODO Determine if it is interesting to handle "pause" and "cont" events or if we merely ignore them
		    break;
		default:
		    logger.info("Unknown event action '%s'", testevent.Action);
	    }
	    return;
	}
	var path;
	if (!pkg.testMap.has(testevent.Test)) {
	    test = {
		type: "Test",
		name: testevent.Test,
		groupEmbed: [],
		asciicasts: [],
	    };
	    var i = testevent.Test.lastIndexOf("/");
	    if (i == -1) {
		// not a subtest, parent is pkg
		var ti = pkg.tests.push(test) - 1;
		path = [ti];
		pkg.testMap.set(testevent.Test, path);
	    } else {
		var parentName = testevent.Test.slice(0, i);
		if(!pkg.testMap.has(parentName)) {
		    logger.info("Test Created before its parent '%s'", event.Test);
		} else {
		    var parentPath = pkg.testMap.get(parentName);
		    var parentTest = pkg.TestFromPath(parentPath);
		    var ti = parentTest.groupEmbed.push(test) - 1;
		    parentTest.hasSubtests = true;
		    path = parentPath.concat([ti]);
		    pkg.testMap.set(testevent.Test, path);
		}
	    }
	} else {
	    path = pkg.testMap.get(testevent.Test);
	    test = pkg.TestFromPath(path);
	}

	switch (testevent.Action) {
	    case "run":
		test.startDateRaw = testevent.Time;
		test.startDate = dateFormatStd(testevent.Time);
		// only count top tests
		if (path.length == 1) run.testCount++;
		break;
	    case "pass":
		test.duration = duration(test.startDateRaw, testevent.Time);
		test.endDate = dateFormatStd(testevent.Time);
		test.status = "PASS";
		test.opencollapsed = true;
		if (path.length == 1) run.testPassCount++;
		break;
	    case "fail":
		test.endDate = testevent.Time;
		test.status = "FAIL";
		if (path.length == 1) run.testFailCount++;
		break;
	    case "output":
		var embed = {
		    type:   "Output",
		    time:   testevent.Time,
		    output: testevent.Output,
		};
		if (testevent.Output.length > 160) {
		    pkg.tests[path[0]].hasLongContent = true;
		}

		// Parse Asciicast
		var castRE = RegExp('\\*\\*\\* Asciicast \'.*/((.*)\\.cast)\' (start|end)');
		var m = castRE.exec(testevent.Output);
		if (m) {
		    var name = m[2];
		    var url = run.asciicastURL + m[1];
		    var cast;
		    var cid = _.findIndex(test.asciicasts, function(c){return c.name === name; });
		    if (cid == -1) {
			cast = {
			    type: "Asciicast",
			    name: name,
			    url: url,
			    time: testevent.Time,
			};
			test.asciicasts.push(cast);
		    } else {
			cast = test.asciicasts[cid];
		    }
		    // Only add ended cast (the player cannot stream)
		    if (m[3] == 'end') {
			cast.tag = '<asciinema-player id="cast-' + name + '" src="' + url + '" preload="yes"></asciinema-player>';
		    }
		    pkg.tests[path[0]].hasLongContent = true;
		    embed.html = "*** Asciicast '<a href=\""+url+"\" download=\""+name+".cast\">"+name+".cast</a>' "+m[3]+"\n";
		}

		// Add the output to a group
		var i = test.groupEmbed.length - 1;
		if ((i < 0) || (test.groupEmbed[i].type !== "OutputGroup")) {
		    outputGroup = { type:"OutputGroup", outputs:[] };
		    i = test.groupEmbed.push(outputGroup)-1;
		}
		test.groupEmbed[i].outputs.push(embed);
		break;
	    case "skip":
		test.endDate = dateFormatStd(testevent.Time);
		test.status = "SKIP";
		test.opencollapsed = true;
		if (path.length == 1) run.testSkipCount++;
		break;
	    case "pause":
	    case "cont":
		// TODO Determine if it is interesting to handle "pause" and "cont" events or if we merely ignore them
		break;
	    default:
		logger.info("Unknown event action '%s'", testevent.Action);
	}
    }

    function dateFormatFromNow(date) {
        return moment(date, apiDateFormat).fromNow();
    }

    function dateFormatStd(date) {
        return moment(date, apiDateFormat).format('MM/DD/YYYY HH:mm:ss Z');
    }

    function duration(startDate, endDate) {
        var d = moment.duration(moment(endDate, apiDateFormat).diff(moment(startDate, apiDateFormat)));
        return d.asSeconds().toLocaleString(undefined, { minimumFractionDigits: 3 });
    }

    function asciinemaPlayerSeek(playerNode, time) {
	var seekTo = moment.duration(time.diff(moment(playerNode.get('time'), apiDateFormat)));
	var player = ractive.find('#cast-' + playerNode.get('name'));
	player.currentTime = seekTo.asSeconds();
    }

    function finalize() {
        logger.info('Run :: finalize');
	if (ws) {
	    ws.close();
	}
    }

    return {
        initialize: initialize,
        finalize: finalize,
    };

});
