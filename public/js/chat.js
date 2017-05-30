function deleteChannel(id) {
    $.ajax({
      url: `/direct_message/${id}/deactivate`,
      method: "GET"
    })
    .fail(function() {
        console.log("Failed to delete user from direct message");
    })
    .done(function() {
        $("#channel-" + id).html("")
    });
}