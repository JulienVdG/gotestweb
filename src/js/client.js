define(['underscore'], function (_) {

    function buildUrl(opts) {
        var url = opts.path;

        if (_.isUndefined(opts.params) || opts.params === null) {
            return url;
        }

        if (!_.isObject(opts.params)) {
            opts.error('"params" field must be an object', null);
            return url;
        }

        if (_.isEmpty(opts.params)) {
            return url;
        }

        url += '?';
        var isFirst = true;
        for (var key in opts.params) {
            if (isFirst) {
                isFirst = false;
            }
            else {
                url += '&';
            }
            url += key + '=' + opts.params[key];
        }

        return url;
    }

    function http(opts) {
        if (_.isUndefined(opts.path) || opts.path === '' || opts.path === null) {
            if (!_.isUndefined(opts.error)) {
                opts.error('"name" field is not defined', null);
            }
            return;
        }

        $.ajax({
            error: function (jqXHR, status, error) {
                if ("error" in opts) {
                    opts.error(error, jqXHR.status, jqXHR.responseText);
                }
            },
            success: function (data, status, jqXHR) {
                if ('success' in opts) {
                    opts.success(data, status);
                }
            },
            complete: function (jqXHR, status) {
                if ("complete" in opts) {
                    opts.complete(status);
                }
            },
            dataType: 'text',
            type: opts.method,
            data: opts.data,
            url: buildUrl(opts)
        });
    }

    function goToPage(path, params) {
        window.location.href = buildUrl({
            path: path,
            params: params
        });
    }

    return {
        goToPage: goToPage,
        http: http,
    };

});
