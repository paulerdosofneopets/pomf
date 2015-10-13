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

var pomf_url;
var pomf_file_url;

function update_pomf_url ()
{
    if (prefs.prefHasUserValue ('url'))
    {
        pomf_url = prefs.getCharPref ('url');
    }
    else
    {
        pomf_url = default_prefs.getCharPref ('url');
    }

    if (prefs.prefHasUserValue ('file_url'))
    {
        pomf_file_url = prefs.getCharPref ('file_url');
    }
    else
    {
        pomf_file_url = default_prefs.getCharPref ('file_url');
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

    uri = pomf_file_url + '/' + uri;

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

            update_pomf_url ();

            console.log ('pomf url is ' + pomf_url);

            form_data.append ('files[]', file);

            console.log ('uploading ' + destination);

            request.open ('POST', pomf_url + '/upload.php');
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
