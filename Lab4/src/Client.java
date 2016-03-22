import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.*;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;

public class Client {

    private static String hostname;
    private static String remoteObjName;

    private static Request request;
    public static void main(String[] args) {
        if (args.length < 4) {
            System.out.println("Usage:");
            System.out.println("\tClient <host_name> <remote_object_name> <oper> <opnd>*");
            return;
        }
        hostname = args[0];
        remoteObjName = args[1];
        String reqString = args[2].toUpperCase();
        for (int i = 3; i < args.length; ++i) {
            reqString = reqString.concat(" " + args[i]);
        }

        try {
            Registry registry = LocateRegistry.getRegistry(hostname);
            ServerRMI rmi = (ServerRMI) registry.lookup(remoteObjName);

            String response = rmi.request(reqString);
            System.out.println(reqString + " :: " +  response);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }
}
