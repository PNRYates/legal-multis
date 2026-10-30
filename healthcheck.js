// Used by Docker and Coolify without requiring curl in the runtime image.
fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/papers`)
  .then(async (response) => {
    if (!response.ok || (await response.json()).length !== 52) process.exit(1);
  })
  .catch(() => process.exit(1));
