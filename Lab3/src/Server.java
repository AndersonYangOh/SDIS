import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.*;
import java.util.HashMap;

public class Server {

    private int srvcPort;

    private ServerSocket srvSocket;

    private HashMap<String, String> licencePlates = new HashMap<>();

    public static void main(String[] args) {
        if (args.length != 1) {
            System.out.println("Usage:");
            System.out.println("\tServer <srvc_port>");

            System.exit(0);
        }

        int port = Integer.parseInt(args[0]);

        Server server = new Server(port);
        server.start();
    }

    public Server(int port) {
        this.srvcPort = port;
    }

    public void start() {
        System.out.println("* Starting server on port: " + this.srvcPort);
        try {
            System.out.println("+ Opening server socket...");
            srvSocket = new ServerSocket(srvcPort);
            this.listen();
            System.out.println("- Closing server socket...");
            srvSocket.close();
        } catch (IOException e) {
            System.err.println("Couldn't listen on port " + srvcPort);
            e.printStackTrace();
            System.exit(-1);
        }
    }

    private int listen() {
        boolean done = false;
        while (!done) {
            System.out.println("? Waiting for request...");

            Socket socket = null;
            try {
                socket = srvSocket.accept();
            }
            catch (IOException e) {
                System.err.println("ERROR: " + srvcPort);
                System.exit(-1);
            }

            try {
                BufferedReader inBuff = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                PrintWriter outBuff = new PrintWriter(socket.getOutputStream(), true);

                String request_str = inBuff.readLine();
                System.out.println("! Received request");
                String response = "";
                Request request = new Request(request_str);
                if (request.type.equals("REGISTER")) {
                    if (licencePlates.containsKey(request.plateNumber)) {
                        response = "-1";
                    }
                    else {
                        licencePlates.put(request.plateNumber, request.owner);
                        response = Integer.toString(licencePlates.size());
                    }
                }
                else if (request.type.equals("LOOKUP")) {
                    if (licencePlates.containsKey(request.plateNumber)) {
                        response = request.plateNumber + " " + licencePlates.get(request.plateNumber);
                    }
                }

                System.out.println("\t" + request.toString() + " :: " + response);

                outBuff.println(response);

                outBuff.close();
                inBuff.close();

                socket.close();
            }
            catch (IllegalArgumentException e) {
                e.printStackTrace();
            }
            catch (IOException e ) {
                e.printStackTrace();
            }
        }
        return 1;
    }
}
