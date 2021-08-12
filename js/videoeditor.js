$(document).ready(function(){
    var blobs = recordedBlobs;
    var player;
    var trimslider = document.getElementById('trimslider');
    var removeslider = document.getElementById('removeslider');
    var setup = true;
    var downloaded = false;
    var folderId = "2a40c59f6537465aa676fd49d5ea6e33";
    
    // Show recorded video
    var superBuffer = new Blob(recordedBlobs, {
        type: 'video/webm'
    });
    
    function authenticate() {
        let email = document.getElementById("userName").value;
        let password = document.getElementById("password").value;
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                res = JSON.parse(this.responseText);
                if (res.access_token) {
                    localStorage.setItem("access_token", res.access_token);
                    localStorage.setItem("token_type", res.token_type);
                    localStorage.setItem("id", res.id);
                    location.reload();
                    //var html = '<a href="' + file.url + '" download="' + file.name + '" class="buttonDownload" >Download</a>';
                    browserCache.innerHTML = html;
                    document.getElementById("myModal").close();
                }
            }
            else if (this.readyState == 4 && this.status == 500) {
                confirm("Credentials Are Not Matched. Please Try Again!")
            }
        };
        xhttp.open("POST", "http://meander.video/token", true);
        xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhttp.send(`email=${email}&password=${password}`);
    }

    var nodecUrl = "http://meander.video";
    var uppy2 = new Uppy.Core({
        meta: { userId: localStorage.getItem("id"), foldername: ""+folderId },
        debug: true,
        autoProceed: false,
        restrictions: { maxNumberOfFiles: 3, allowedFileTypes: ["audio/*", "video/*"] },
    }).use(Uppy.AwsS3Multipart, {
        limit: 3,
        companionUrl: nodecUrl+"/swift/",
        Headers : { "uppy-auth-token" : "bearer "+localStorage.getItem("access_token")  },
       companionHeaders:{ "uppy-auth-token" : "bearer "+  localStorage.getItem("access_token") },
        getChunkSize(file) {
            var chunks = Math.ceil(file.size / (5 * 1024 * 1024));
            return file.size < 5 * 1024 * 1024
                ? 5 * 1024 * 1024
                : Math.ceil(file.size / (chunks - 1));
        },
    });
    
    uppy2.setOptions({
        onBeforeFileAdded: (currentFile, files) => {
          var time = Date.now();     var uuid =  String(time);
          var chunks =   Math.ceil( currentFile.data.size / (5*1024*1024));
          if(dispName === undefined || dispName === null)
            uppy.info("Please select a folder");
          const modifiedFile = {        ...currentFile,
            name: uuid + "." + currentFile.name.split(".")[1],
            size : currentFile.data.size ,  type : currentFile.type ,
            meta : { filename :uuid + "." +currentFile.name.split(".")[1],     userId : localStorage.getItem("id") , 
            foldername : folderId ,
            title : currentFile.name , name : currentFile.name , total_size : currentFile.data.size,
            type : currentFile.type , time : String(time) , total_chunks :  chunks-1,
            chunk_size : currentFile.data.size < 5*1024*1024 ?   5*1024*1024 :  Math.ceil(currentFile.data.size /(chunks-1)) ,
            uploadIdToContinue : null }
          };
          return modifiedFile;
        },
      });
      uppy2.setMeta({
        userId: localStorage.getItem("id") ,
        foldername: folderId,
      });
    
    function uploadRecording() {
    if (localStorage.getItem('access_token')) {
        console.log(folderId)
        if (folderId != null) {
            var file = new Blob(blobs, {
                type: 'video/mp4'
            });            
            uppy2.addFile({
                name: 'video.mp4',
                type: 'video/mp4',
                data: superBuffer
            });

            uppy2.upload().then((result) => {
               console.info('Successful uploads:', result.successful);   } 
    }

    // Create the src url from the blob. #t=duration is a Chrome bug workaround, as the webm generated through Media Recorder has a N/A duration in its metadata, so you can't seek the video in the player. Using Media Fragments (https://www.w3.org/TR/media-frags/#URIfragment-user-agent) and setting the duration manually in the src url fixes the issue.
    var url = window.URL.createObjectURL(superBuffer);
    $("#video").attr("src", url+"#t="+blobs.length);
    $("#format-select").niceSelect();
    $("#g-savetodrive").attr("src", url);
    
    
    // Convert seconds to timestamp
    function timestamp(value) {
        var sec_num = value;
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours   < 10) {hours   = "0"+hours;}
        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        return hours+':'+minutes+':'+seconds;
    }
    
    // Initialize range sliders
    function initRanges() {
        noUiSlider.create(trimslider, {
            start: [blobs.length],
            connect: "upper",
            range: {
                'min': 0,
                'max': blobs.length
            }
        });
        $("#trim-end input").val(timestamp(blobs.length));
        
        noUiSlider.create(removeslider, {
            start: [0, blobs.length],
            connect: true,
            range: {
                'min': 0,
                'max': blobs.length
            }
        });
        $("#remove-end input").val(timestamp(blobs.length));
    }
    
    // Update range values
    function updateRanges(blobs) {
        trimslider.noUiSlider.updateOptions({
           start: [blobs.length],
            range: {
                'min': 0,
                'max': blobs.length
            }
        });
        $("#trim-start input").val(timestamp(0));
        $("#trim-end input").val(timestamp(blobs.length));
        
        removeslider.noUiSlider.updateOptions({
           start: [0, blobs.length],
            range: {
                'min': 0,
                'max': blobs.length
            }
        });
        $("#remove-start input").val(timestamp(0));
        $("#remove-end input").val(timestamp(blobs.length));
        window.setTimeout(function(){
            player.currentTime = 0;
        }, 500)
        player.restart();
    }
    
    // Reset video
    function reset() {
        blobs = recordedBlobs;
        var superBuffer = new Blob(blobs, {
            type: 'video/webm'
        });
        var url = window.URL.createObjectURL(superBuffer);
        $("#video").attr("src", url+"#t="+blobs.length);
        updateRanges(blobs);
    }
    
    // Trim video between two values
    function trim(a, b) {
        blobs = blobs.slice(a, b);
        var superBuffer = new Blob(blobs, {
            type: 'video/webm'
        });
        var url = window.URL.createObjectURL(superBuffer);
        $("#video").attr("src", url+"#t="+blobs.length);
        updateRanges(blobs);
    }
    
    // Remove part of the video
    function remove(a, b) {
        var start = blobs.slice(0, a);
        var end = blobs.slice(b, blobs.length);
        blobs = start.concat(end);
        var superBuffer = new Blob(blobs, {
            type: 'video/webm'
        });
        var url = window.URL.createObjectURL(superBuffer);
        $("#video").attr("src", url+"#t="+blobs.length);
        updateRanges(blobs);
    }
    
    // Download video in different formats
    function download() {
        downloaded = true;
        $("#download-label").html(chrome.i18n.getMessage("downloading"))
        if ($("#format-select").val() == "mp4") {
            var superBuffer = new Blob(blobs, {
                type: 'video/mp4'
            });
            var url = window.URL.createObjectURL(superBuffer);
            chrome.downloads.download({
                url: url
            });
            $("#download-label").html(chrome.i18n.getMessage("download"))
            
        } else if ($("#format-select").val() == "webm") {
            var superBuffer2 = new Blob(blobs, {
                type: 'video/webm'
            });
            var url = window.URL.createObjectURL(superBuffer2);
            chrome.downloads.download({
                url: url
            });
            $("#download-label").html(chrome.i18n.getMessage("download"))
        } else if ($("#format-select").val() == "gif") {
            var superBuffer = new Blob(blobs, {
                type: 'video/webm'
            });
            convertStreams(superBuffer, "gif");
        }
    }
    
    // Save on Drive
    function saveDrive() {
        downloaded = true;
        chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
            if (!token) {
              return;
            }
            $("#share span").html(chrome.i18n.getMessage("saving"));
            $("#share").css("pointer-events", "none");
            var metadata = {
                name: 'video.mp4',
                mimeType: 'video/mp4'
            };
            var superBuffer = new Blob(blobs, {
                type: 'video/mp4'
            });
            var form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
            form.append('file', superBuffer);

            // Upload to Drive
            var xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.responseType = 'json';
            xhr.onload = () => {
                var fileId = xhr.response.id;
                $("#share span").html("Save to Drive");
                $("#share").css("pointer-events", "all");
                
                // Open file in Drive in a new tab
                chrome.tabs.create({
                     url: "https://drive.google.com/file/d/"+fileId
                });
            };
            xhr.send(form);
        });
    }
    
    // Check when video has been loaded
    $("#video").on("loadedmetadata", function(){

        // Initialize custom video player
        player = new Plyr('#video', {
            controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
            ratio: '16:9'
        });
        
        // Check when player is ready
        player.on("canplay", function(){
            // First time setup
            if (setup) {
                setup = false;
                initRanges();
                player.currentTime = 0;
            }
            
            // Check when trim slider values change
            trimslider.noUiSlider.on('slide', function(values, handle) {
                $("#trim-start input").val(timestamp(0));
                $("#trim-end input").val(timestamp(values[0]));
                player.currentTime = parseFloat(values[handle]);
            });
            
            // Check when remove slider values change
            removeslider.noUiSlider.on('slide', function(values, handle) {
                $("#remove-start input").val(timestamp(values[0]));
                $("#remove-end input").val(timestamp(values[1]));
                player.currentTime = parseFloat(values[handle]);
            });
            
        });
    })
    

    // Applying a trim
    $("#apply-trim").on("click", function(){
        trim(0, parseInt(trimslider.noUiSlider.get()[0]));
    });
    
    // Removing part of the video
    $("#apply-remove").on("click", function(){
        remove(parseInt(removeslider.noUiSlider.get()[0]), parseInt(removeslider.noUiSlider.get()[1]));
    });
    
    // Download video
    $("#download").on("click", function(){
        download();
    });
    
    // Save on Drive
    $("#share").on("click", function(){
        saveDrive();
    });
    
    // Revert changes made to the video
    $("#reset").on("click", function(){
        reset();
    });
    
    // For mobile version
    $("#show-hide").on("click", function(){
        $("#settings").toggleClass("hidepanel");
        $("#export").toggleClass("hidepanel");
    }) ;
    
    // Localization (strings in different languages)
    $("#made-with").html(chrome.i18n.getMessage("made_with"));
    $("#by-alyssa").html(chrome.i18n.getMessage("by_alyssa"));
    $("#rate-label").html(chrome.i18n.getMessage("rate_extension"));
    $("#show-hide").html(chrome.i18n.getMessage("show_hide"));
    $("#edit-label").html(chrome.i18n.getMessage("edit_recording"));
    $("h2").html(chrome.i18n.getMessage("edit_recording_desc"));
    $("#format-select-label").html(chrome.i18n.getMessage("format"));
    $("#webm-default").html(chrome.i18n.getMessage("webm"));
    $("#trim-label").html(chrome.i18n.getMessage("trim_video"));
    $(".start-label").html(chrome.i18n.getMessage("start"));
    $(".end-label").html(chrome.i18n.getMessage("end"));
    $("#apply-trim").html(chrome.i18n.getMessage("apply"));
    $("#remove-label").html(chrome.i18n.getMessage("remove_part"));
    $("#format-select-label").html(chrome.i18n.getMessage("format"));
    $("#apply-remove").html(chrome.i18n.getMessage("apply"));
    $("#reset").html(chrome.i18n.getMessage("reset"));
    $("#download-label").html(chrome.i18n.getMessage("download"));
    $("#share span").html(chrome.i18n.getMessage("save_drive"));
    $("#apply-trim").html(chrome.i18n.getMessage("apply"));
    
    // Automatically download when closing if the user hasn't downloaded the file
    addEventListener("unload", function(event) {
        if (!downloaded) {
            download();
        }
    }, true);
});
