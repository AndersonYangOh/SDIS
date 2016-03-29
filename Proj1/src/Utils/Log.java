package Utils;

import Protocol.Message.Message;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;

public class Log {
    // TODO: Write to actual log file instead of stdout
    public static final void message(Message msg) {
        System.out.println("----------------------------");
        System.out.println(msg);
        System.out.println("----------------------------");
    }
    public static final void messageBrief(Message msg) {
        messageBrief(msg, "");
    }
    public static final void messageBrief(Message msg, String add) {
        String header = msg.header();
        info(add + header.substring(0, header.length()-4), "");
    }
    public static final void messageBrief(Message msg, String add, String channel) {
        String header = msg.header();
        info(add + header.substring(0, header.length()-4), channel);
    }

    public static final void error(String s) {
        error(s, "");
    }
    public static final void error(String s, String channel) {
        System.err.println(getCurrTime()+" "+channel(channel)+"*ERROR* " + s);
    }

    public static final void info(String s) {
        info(s, "");
    }
    public static final void info(String s, String channel) {
        System.out.println(getCurrTime()+" "+channel(channel)+"*INFO* " + s);
    }

    public static final void warning(String s) {
        warning(s, "");
    }
    public static final void warning(String s, String channel) {
        System.out.println(getCurrTime()+" "+channel(channel)+"*WARNING* " + s);
    }


    private static final String channel(String c) {
        if (c.length() > 0)
            return "["+c+"] ";
        return "";
    }
    private static final String getCurrTime() {
        DateFormat dateFormat = new SimpleDateFormat("HH:mm:ss");
        Date date = new Date();
        return "["+dateFormat.format(date)+"]";
    }
}
