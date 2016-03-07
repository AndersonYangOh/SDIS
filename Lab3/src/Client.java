import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.*;

public class Client {

    private static String hostname;
    private static int srvcPort;

    private static Request request;
    public static void main(String[] args) {
        if (args.length < 3) {
            System.out.println("Usage:");
            System.out.println("\tClient <hostname> <port> <oper> <opnd>*");
            return;
        }
        hostname = args[0];
        srvcPort = Integer.parseInt(args[1]);
        String reqString = args[2].toUpperCase();
        for (int i = 3; i < args.length; ++i) {
            reqString = reqString.concat(" " + args[i]);
        }
        request = new Request(reqString);

        try {
            Socket socket = new Socket(hostname, srvcPort);

            PrintWriter outBuff = new PrintWriter(socket.getOutputStream(), true);
            BufferedReader inBuff = new BufferedReader(new InputStreamReader(socket.getInputStream()));

            System.out.println("+----------- CLIENT -------------");
            System.out.println("| Host: " + hostname + ":" + srvcPort);
            System.out.println("| Request: " + request.toString());
            System.out.println("+--------------------------------");

            outBuff.println(request.toString());

            System.out.print(request.toString() + " :: ");
            String response = inBuff.readLine();

            System.out.println(response);

            outBuff.close();
            inBuff.close();

            socket.close();
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }
}
