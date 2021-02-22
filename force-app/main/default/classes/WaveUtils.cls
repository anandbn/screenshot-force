public class WaveUtils {
    private static final String DASHBOARD_LIST_URL = URL.getSalesforceBaseUrl().toExternalForm()+'/services/data/v43.0/wave/dashboards';
    private static final String LENS_LIST_URL = URL.getSalesforceBaseUrl().toExternalForm()+'/services/data/v43.0/wave/lenses';
    
    
    public static String getSessionId(){
        Blob sessionIdBlob = Page.GetSessionId.getContent();
        JSONParser parser = JSON.createParser(sessionIdBlob.toString());
        String sessionId = '';
        while (parser.nextToken() != null) {
            if ((parser.getCurrentToken() == JSONToken.FIELD_NAME) && 
                (parser.getText() == 'sessionId')) {
                    // Get the value.
                    parser.nextToken();
                    // Compute the grand total price for all invoices.
                    sessionId=parser.getText();
                }
        }
        return sessionId;
    }
    
    private static String waveRestRequest(String url){
        String sessionId = getSessionId();
		Http h = new Http();
        
        // Instantiate a new HTTP request, specify the method (GET) as well as the endpoint
        HttpRequest req = new HttpRequest();
        req.setEndpoint(url);
        req.setHeader('Authorization','OAuth '+sessionId);
        req.setMethod('GET');
        
        // Send the request, and return a response
        HttpResponse res = h.send(req);
        return res.getBody();        
    }
    public static List<EADashboardResponseParser.Dashboards> getDashboardList(){
        String jsonResp = waveRestRequest(DASHBOARD_LIST_URL);
        EADashboardResponseParser parsedResp = EADashboardResponseParser.parse(jsonResp);
        return parsedResp.dashboards;
        
    }
    
    public static List<EALensResponseParser.Lenses> getLensList(){
        String jsonResp = waveRestRequest(LENS_LIST_URL);
        EALensResponseParser parsedResp = EALensResponseParser.parse(jsonResp);
        return parsedResp.lenses;
    }
}