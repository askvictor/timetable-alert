function showAlarms(){
    let alarmslist = document.getElementById("alarms")
    chrome.alarms.getAll(function(alarms){
        alarms.forEach(function(alarm){
            var p = document.createElement("p");
            if(alarm.name != 'daily') {
                let name = alarm.name.split(":", 1)[0]
                var b = document.createElement("b")
                b.appendChild(document.createTextNode(name + " " ))
                p.appendChild(b)
                p.appendChild(document.createTextNode(  (new Date(alarm.scheduledTime)).toLocaleString()));
                alarmslist.appendChild(p);
            }
        })
        if(alarmslist.childElementCount == 1){  //only heading is there; ignore the whole div
            alarmslist.hidden = true;
        }
    })
}

function showToggle(){
    var checkbox = document.getElementById('switch-global');
    chrome.storage.local.get({globalEnable: true}, function(result){
        checkbox.checked = result['globalEnable']
        toggleTextGlobal(checkbox.checked)
    })
}

function toggleTextGlobal(checked){
    var checkboxLabel = document.getElementById('switch-global-label');
    if(checked){
        checkboxLabel.textContent = "On (click to turn off)"
    }else{
        checkboxLabel.textContent = "Off (click to turn on)"
    }
}

function toggleGlobal(){
  var checkbox = document.getElementById('switch-global');
  chrome.storage.local.set({globalEnable: checkbox.checked})
  toggleTextGlobal(checkbox.checked)
}

document.addEventListener('DOMContentLoaded', showAlarms);
document.addEventListener('DOMContentLoaded', showToggle);
document.getElementById('switch-global').addEventListener('change', toggleGlobal)
document.getElementById('settingsButton').addEventListener('click', function(){chrome.runtime.openOptionsPage()});
