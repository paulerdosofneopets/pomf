/*
working clones-
pomf.cat
pomf.io
pomf.hummingbird.moe
1339.cf
mixtape.moe
 */

let { Cc, Ci, Cu, CC }  = require ('chrome');
var self                = require ('sdk/self');
var context_menu        = require ('sdk/context-menu');
var file_io             = require ('sdk/io/file');

var prefs           = Cc ['@mozilla.org/preferences-service;1']
    .getService (Ci.nsIPrefService).getBranch ('extensions.pomf.');
var default_prefs   = Cc ['@mozilla.org/preferences-service;1']
    .getService (Ci.nsIPrefService).getDefaultBranch ('extensions.pomf.');

Cu.importGlobalProperties(['File']);

Cu.import ('resource://gre/modules/Downloads.jsm');
Cu.import ('resource://gre/modules/osfile.jsm')
Cu.import ('resource://gre/modules/Task.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');

var pomf_uploader;
var pomf_host;

function update_prefs ()
{
    if (prefs.prefHasUserValue ('uploader'))
    {
        pomf_uploader = prefs.getCharPref ('uploader');
    }
    else
    {
        pomf_uploader = default_prefs.getCharPref ('uploader');
    }

    if (prefs.prefHasUserValue ('host'))
    {
        pomf_host = prefs.getCharPref ('host');
    }
    else
    {
        pomf_host = default_prefs.getCharPref ('host');
    }
}

function open_response_url ()
{
    var wm          = Cc ['@mozilla.org/appshell/window-mediator;1']
    .getService (Ci.nsIWindowMediator);
    var win = wm.getMostRecentWindow ('navigator:browser');
    var uri = JSON.parse (this.responseText).files [0].url;

    console.log ('response is ' + this.responseText);

    console.log ('opening ' + uri);

    uri = pomf_host + '/' + uri;

    win.gBrowser.selectedTab = win.gBrowser.addTab (uri);
}

function save_link (uri)
{
    var destination = '';
    var split       = uri.split ('/');
    var base_name   = split [split.length - 1];

    if (uri == '')
    {
        console.log ('empty request');
        return;
    }

    if (base_name == '')
    {
        base_name = 'index.html';
    }

    destination = OS.Path.join (OS.Constants.Path.tmpDir, base_name);

    console.log ('downloading ' + uri);

    Task.spawn
    (
        function ()
        {
            yield Downloads.fetch (uri, destination);
        }
    ).then
    (
        function ()
        {
            var request     = Cc ['@mozilla.org/xmlextras/xmlhttprequest;1'].
                                createInstance ();
            var form_data   = Cc ['@mozilla.org/files/formdata;1'].
                                createInstance ();
            var file        = new File (destination);

            update_prefs ();

            console.log ('pomf uploader is ' + pomf_uploader);

            form_data.append ('files[]', file);

            console.log ('uploading ' + destination);

            request.open ('POST', pomf_uploader);
            request.addEventListener ('load', open_response_url);
            request.send (form_data);
        },
        Cu.reportError
    );
}

var pomf_link_menu_item = context_menu.Item
({
    label:          'Link Upload',
    accessKey:      'L',
    context:        context_menu.SelectorContext ('a[href]'),

    contentScript:  'self.on ("click",'             +
                    '   function (node)'            +
                    '   {'                          +
                    '      var uri = node.href;'    +
                    '      self.postMessage (uri);' +
                    '   }'                          +
                    ');',

    onMessage:      function (uri)
                    {
                        var file_name = save_link (uri);
                    }
});

var pomf_img_menu_item = context_menu.Item
({
    label:          'Image Upload',
    accessKey:      'I',
    context:        context_menu.SelectorContext ('img'),

    contentScript:  'self.on ("click",'             +
                    '   function (node)'            +
                    '   {'                          +
                    '      var uri = node.src;'     +
                    '      self.postMessage (uri);' +
                    '   }'                          +
                    ');',

    onMessage:      function (uri)
                    {
                        var file_name   = save_link (uri);
                    }
});
