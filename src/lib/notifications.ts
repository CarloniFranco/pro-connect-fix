import { supabase } from "@/integrations/supabase/client";

interface SendNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  serviceRequestId?: string;
}

export async function sendNotification(params: SendNotificationParams) {
  try {
    const { error } = await supabase.functions.invoke("send-notification", {
      body: {
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        service_request_id: params.serviceRequestId,
      },
    });
    if (error) console.error("Notification error:", error);
  } catch (e) {
    console.error("Failed to send notification:", e);
  }
}
