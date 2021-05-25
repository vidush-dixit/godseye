// ===========================
// Suggestions Form Validation

function suggestions(){
    var text = document.getElementById('suggestionText').value;
    var check = document.getElementById('suggestionCheck').checked;
    var sugAlert = document.getElementById('suggestionAlert');

    if(check == true && text.length>5){
        sugAlert.className = "alert alert-success";
        sugAlert.innerHTML = "Suggestion Recorded!!";
    }
    else{
        sugAlert.className = "alert alert-warning";
        if(check == false){
            sugAlert.innerHTML = "Please Check to Submit";
        }
        else{
            sugAlert.innerHTML = "Must be at least 5 Characters!!";
        }
    }
    sugAlert.style.display = 'block';
    setTimeout(function(){
        sugAlert.style.display = 'none';
    },2000);
    document.getElementById('suggestionForm').reset();
}

// =========================
// Toggle AlertBox Container
function showAlert(tempAlert,tempClass,tempText){
    tempAlert.className = tempClass;
    tempAlert.innerHTML = tempText;
    tempAlert.style.display = 'block';
    setTimeout(function(){
        tempAlert.style.display = 'none';
    },2000);
}