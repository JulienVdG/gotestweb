define('logger', function() {

    function isEnable() {
        return localStorage ? (localStorage.getItem("gotest.logging") === 'true') : false;
    }

    function log(severity, message) {
        try {
            if (!isEnable() || typeof console === 'undefined') {
                return;
            }
            var text = "[" + new Date().toLocaleString().replace(",", "") + "] " + severity + " | " + message;
            if (severity === 'error') {
                console.error(text);
            } else {
                console.log(text);
            }
        }
        catch(err) {
            if (typeof console !== 'undefined') {
                console.log("Ignored logging error");
            }
        }
    }

    function info(message) {
        log(' INFO', message);
    }

    function debug(message) {
        log('DEBUG', message);
    }

    function error(message) {
        log('ERROR', message);
    }

    return {
        log: log,
        info: info,
        debug: debug,
        error: error,
        isEnable: isEnable,
    };
});

define('app', ['ractive', 'hasher', 'logger', 'underscore', 'run'], function(ractive, hasher, logger, _, run) {

    logger.debug("Defining Module :: app");

    var DEFAULT_PAGE = '?';
    var SCRIPT_PARAM = $('script').last().data();

    function log(message) {
        logger.debug("App :: " + message);
    }

    function getBool(param, key, def) {
	if (param.hasOwnProperty(key)) {
	    if (_.isBoolean(param[key])) {
		return param[key];
	    } else if (_.isNumber(param[key])) {
		return param[key] !== 0;
	    } else {
		switch(param[key].toLowerCase().trim()){
		    case "false": case "no": case "0":
			return false;
		    default:
			return true;
		}
	    }
	} else {
	    return def;
	}
    }

    function parseHash(hash) {
        log("Parsing hash  :: hash = " + hash);
        var i = hash.indexOf('?');
        var url;
        if (i === -1) {
            url = hash;
        }
        else {
            url = hash.substring(0, i);
        }

        var params = {};
        var paramList = hash.substring(i+1, hash.length).split('&');
        for (var n = 0 ; n < paramList.length ; n++) {
            var param = paramList[n];
            i = param.indexOf('=');
            if (i === -1) {
                params[param] = param;
            }
            else {
                params[param.substring(0, i)] = param.substring(i+1, params.length);
            }
        }

        return {
            url: url,
            params: params
        };
    }

    function checkParams(parsedHash) {
	var live = getBool(parsedHash.params, 'live', getBool(SCRIPT_PARAM, 'live', false));
	var file = '';
	if (SCRIPT_PARAM.hasOwnProperty('file')) { file = SCRIPT_PARAM.file; }
	if (parsedHash.url != "") { file = parsedHash.url; }
	if (parsedHash.params.hasOwnProperty('file')) { file = parsedHash.params.file; }
	var dir = '';
	var i = file.lastIndexOf("/");
	if (i != -1) {
	    dir = file.slice(0, i) + '/';
	}
	// summary default to live
	var summary = getBool(parsedHash.params, 'summary', getBool(SCRIPT_PARAM, 'summary', live));
	var asciicast = dir;
	if (SCRIPT_PARAM.hasOwnProperty('asciicast')) { asciicast = SCRIPT_PARAM.asciicast + '/'; }
	if (parsedHash.params.hasOwnProperty('asciicast')) { asciicast = parsedHash.params.asciicast + '/'; }

	return {
	    live: live,
	    file: file,
	    dir: dir,
	    summary: summary,
	    asciicast: asciicast
	};
    }

    function rebuildHash(parsedParams) {
	var p = [];
	if (parsedParams.live) p.push('live');
	if (parsedParams.summary) p.push('summary');
	if (parsedParams.asciicast != parsedParams.dir) p.push('asciicast=' + parsedParams.asciicast);

	if (p.length == 0) return parsedParams.file;
	return parsedParams.file + '?' + p.join('&');
    }

    function handleChanges(newHash, oldHash) {
        log("handleChanges :: new = " + newHash + ", old = " + oldHash);
        var fragment;
        var pageModule;
        if (oldHash !== undefined && oldHash !== '') {
            if (oldHash === newHash) {
                return;
            }
	    run.finalize();
        }
        if (newHash !== undefined) {
            if (newHash === '') {
                newHash = DEFAULT_PAGE;
            }
            fragment = parseHash(newHash);
	    checkedParams = checkParams(fragment);
            run.initialize(checkedParams);
        }
    }

    function Init() {
        log("Init");
	var defaultParams = checkParams({
            url: "",
            params: {}
        });
	DEFAULT_PAGE = rebuildHash(defaultParams);
        hasher.changed.add(handleChanges);
        hasher.initialized.add(handleChanges);
        hasher.init();
    }

    return {
        Init: Init,
    };

});

require(['app', 'logger', 'ractive'], function(app, logger, ractive) {
    logger.info("Initialize application");

    app.Init();
});

define('ractive', ['Ractive', 'logger', 'partials'], function(Ractive, logger, partials){

    logger.debug("Defining Module :: ractive");

    Ractive.DEBUG = logger.isEnable();

    return new Ractive({
        el: 'wrapper',
        template: partials.template,
        partials: partials.list,
        data: {}
    });
});

define('partials', [
    'text!../pages/run.html',
    'text!../pages/test.html',
], function(index, test) {

    return {
        template: index,
        list: {
            test: test,
        }
    };
});
