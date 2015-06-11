function toggleDiv(obj, name) {
  $(name).slideToggle(function() {
    if ($(name).css("display") === "none")
      obj.innerHTML = obj.innerHTML.replace("-", "+");
    else
      obj.innerHTML = obj.innerHTML.replace("+", "-");
  });
}
