export const onRequest: PagesFunction = async (context) => {
  return new Response(
    JSON.stringify({ status: "ok", time: new Date().toISOString(), platform: "cloudflare" }),
    {
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "access-control-allow-origin": "*",
      },
    }
  );
};
