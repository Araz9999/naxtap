import { createTRPCRouter } from './create-context';
import hiRoute from './routes/example/hi/route';
import getConversations from './routes/liveChat/getConversations/route';
import getMessages from './routes/liveChat/getMessages/route';
import createConversation from './routes/liveChat/createConversation/route';
import sendMessage from './routes/liveChat/sendMessage/route';
import markAsRead from './routes/liveChat/markAsRead/route';
import closeConversation from './routes/liveChat/closeConversation/route';
import getAgentStats from './routes/liveChat/getAgentStats/route';
import getPresence from './routes/liveChat/getPresence/route';
import getAllConversations from './routes/liveChat/getAllConversations/route';
import assignAgent from './routes/liveChat/assignAgent/route';
import updateAgentStatus from './routes/liveChat/updateAgentStatus/route';
import chatGetConversations from './routes/chat/getConversations/route';
import chatGetMessages from './routes/chat/getMessages/route';
import chatSendMessage from './routes/chat/sendMessage/route';
import chatMarkAsRead from './routes/chat/markAsRead/route';
import chatDeleteMessage from './routes/chat/deleteMessage/route';
import chatDeleteAllMessagesFromUser from './routes/chat/deleteAllMessagesFromUser/route';
import chatGetUserPreview from './routes/chat/getUserPreview/route';
import { registerProcedure } from './routes/auth/register/route';
import { loginProcedure } from './routes/auth/login/route';
import { verifyEmailProcedure } from './routes/auth/verifyEmail/route';
import { resendVerificationProcedure } from './routes/auth/resendVerification/route';
import { forgotPasswordProcedure } from './routes/auth/forgotPassword/route';
import { resetPasswordProcedure } from './routes/auth/resetPassword/route';
import { verifyPasswordOTPProcedure } from './routes/auth/verifyPasswordOTP/route';
import { registerWithPhoneProcedure } from './routes/auth/registerWithPhone/route';
import { verifyPhoneOTPProcedure } from './routes/auth/verifyPhoneOTP/route';
import { resendPhoneOTPProcedure } from './routes/auth/resendPhoneOTP/route';
import { saveCardProcedure } from './routes/payriff/saveCard/route';
import { getSavedCardsProcedure } from './routes/payriff/getSavedCards/route';
import { deleteCardProcedure } from './routes/payriff/deleteCard/route';
import { createInvoiceProcedure } from './routes/payriff/createInvoice/route';
import { getInvoiceProcedure } from './routes/payriff/getInvoice/route';
import { transferProcedure } from './routes/payriff/transfer/route';
import { topupProcedure } from './routes/payriff/topup/route';
import { getWalletProcedure } from './routes/payriff/getWallet/route';
import { getWalletByIdProcedure } from './routes/payriff/getWalletById/route';
import { createOrderProcedure } from './routes/payriff/createOrder/route';
import { createPaymentProcedure } from './routes/payriff/createPayment/route';
import { getOrderProcedure } from './routes/payriff/getOrder/route';
import { refundProcedure } from './routes/payriff/refund/route';
import { completeProcedure } from './routes/payriff/complete/route';
import { autoPayV3Procedure } from './routes/payriff/autoPayV3/route';
import { getReportsProcedure } from './routes/moderation/getReports/route';
import { createReportProcedure } from './routes/moderation/createReport/route';
import { updateReportStatusProcedure } from './routes/moderation/updateReportStatus/route';
import { getStatsProcedure } from './routes/moderation/getStats/route';
import { getUsersProcedure } from './routes/admin/getUsers/route';
import { getUserProcedure } from './routes/admin/getUser/route';
import { updateUserProcedure } from './routes/admin/updateUser/route';
import { deleteUserProcedure } from './routes/admin/deleteUser/route';
import { getAnalyticsProcedure } from './routes/admin/getAnalytics/route';
import { getModeratorsProcedure } from './routes/admin/getModerators/route';
import { createModeratorProcedure } from './routes/admin/createModerator/route';
import { updateModeratorPermissionsProcedure } from './routes/admin/updateModeratorPermissions/route';
import { updateMeProcedure } from './routes/user/updateMe/route';
import { getUserProcedure as userGetUserProcedure, getAllUsersProcedure } from './routes/user/getUser/route';
import { createTicketProcedure } from './routes/support/createTicket/route';
import { getMyTicketsProcedure } from './routes/support/getMyTickets/route';
import { getTicketsProcedure } from './routes/support/getTickets/route';
import { addTicketResponseProcedure } from './routes/support/addTicketResponse/route';
import { updateTicketStatusProcedure } from './routes/support/updateTicketStatus/route';
import { getCallTokenProcedure } from './routes/call/getToken/route';
import { startCallRecordingProcedure } from './routes/call/startRecording/route';
import { stopCallRecordingProcedure } from './routes/call/stopRecording/route';
import { createCallProcedure } from './routes/call/create/route';
import { getIncomingCallsProcedure } from './routes/call/getIncoming/route';
import { answerCallProcedure } from './routes/call/answer/route';
import { declineCallProcedure } from './routes/call/decline/route';
// Listing routes
import { getAllListingsProcedure } from './routes/listing/getAll/route';
import { getListingByIdProcedure } from './routes/listing/getById/route';
import { createListingProcedure } from './routes/listing/create/route';
import { updateListingProcedure } from './routes/listing/update/route';
import { deleteListingProcedure } from './routes/listing/delete/route';
import { archiveListingProcedure, reactivateListingProcedure } from './routes/listing/archive/route';
import { promoteListingProcedure, incrementViewsProcedure } from './routes/listing/promote/route';
// Store routes
import { getAllStoresProcedure } from './routes/store/getAll/route';
import { getStoreByIdProcedure, getStoreByUserIdProcedure } from './routes/store/getById/route';
import { createStoreProcedure } from './routes/store/create/route';
import { updateStoreProcedure } from './routes/store/update/route';
import { deleteStoreProcedure } from './routes/store/delete/route';
import { followStoreProcedure, unfollowStoreProcedure, getFollowedStoresProcedure, isFollowingStoreProcedure } from './routes/store/follow/route';

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    register: registerProcedure,
    login: loginProcedure,
    verifyEmail: verifyEmailProcedure,
    resendVerification: resendVerificationProcedure,
    forgotPassword: forgotPasswordProcedure,
    resetPassword: resetPasswordProcedure,
    verifyPasswordOTP: verifyPasswordOTPProcedure,
    registerWithPhone: registerWithPhoneProcedure,
    verifyPhoneOTP: verifyPhoneOTPProcedure,
    resendPhoneOTP: resendPhoneOTPProcedure,
  }),
  liveChat: createTRPCRouter({
    getConversations,
    getAllConversations,
    getMessages,
    createConversation,
    sendMessage,
    markAsRead,
    closeConversation,
    getAgentStats,
    assignAgent,
    updateAgentStatus,
    getPresence,
  }),
  chat: createTRPCRouter({
    getConversations: chatGetConversations,
    getMessages: chatGetMessages,
    sendMessage: chatSendMessage,
    markAsRead: chatMarkAsRead,
    deleteMessage: chatDeleteMessage,
    deleteAllMessagesFromUser: chatDeleteAllMessagesFromUser,
    getUserPreview: chatGetUserPreview,
  }),
  payriff: createTRPCRouter({
    createPayment: createPaymentProcedure,
    saveCard: saveCardProcedure,
    getSavedCards: getSavedCardsProcedure,
    deleteCard: deleteCardProcedure,
    createInvoice: createInvoiceProcedure,
    getInvoice: getInvoiceProcedure,
    transfer: transferProcedure,
    topup: topupProcedure,
    getWallet: getWalletProcedure,
    getWalletById: getWalletByIdProcedure,
    createOrder: createOrderProcedure,
    getOrder: getOrderProcedure,
    refund: refundProcedure,
    complete: completeProcedure,
    autoPayV3: autoPayV3Procedure,
  }),
  moderation: createTRPCRouter({
    getReports: getReportsProcedure,
    createReport: createReportProcedure,
    updateReportStatus: updateReportStatusProcedure,
    getStats: getStatsProcedure,
  }),
  support: createTRPCRouter({
    createTicket: createTicketProcedure,
    getMyTickets: getMyTicketsProcedure,
    getTickets: getTicketsProcedure,
    addTicketResponse: addTicketResponseProcedure,
    updateTicketStatus: updateTicketStatusProcedure,
  }),
  admin: createTRPCRouter({
    getUsers: getUsersProcedure,
    getUser: getUserProcedure,
    updateUser: updateUserProcedure,
    deleteUser: deleteUserProcedure,
    getAnalytics: getAnalyticsProcedure,
    getModerators: getModeratorsProcedure,
    createModerator: createModeratorProcedure,
    updateModeratorPermissions: updateModeratorPermissionsProcedure,
  }),
  user: createTRPCRouter({
    updateMe: updateMeProcedure,
    getUser: userGetUserProcedure,
    getAllUsers: getAllUsersProcedure,
  }),
  call: createTRPCRouter({
    create: createCallProcedure,
    getIncoming: getIncomingCallsProcedure,
    answer: answerCallProcedure,
    decline: declineCallProcedure,
    getToken: getCallTokenProcedure,
    startRecording: startCallRecordingProcedure,
    stopRecording: stopCallRecordingProcedure,
  }),
  listing: createTRPCRouter({
    getAll: getAllListingsProcedure,
    getById: getListingByIdProcedure,
    create: createListingProcedure,
    update: updateListingProcedure,
    delete: deleteListingProcedure,
    archive: archiveListingProcedure,
    reactivate: reactivateListingProcedure,
    promote: promoteListingProcedure,
    incrementViews: incrementViewsProcedure,
  }),
  store: createTRPCRouter({
    getAll: getAllStoresProcedure,
    getById: getStoreByIdProcedure,
    getByUserId: getStoreByUserIdProcedure,
    create: createStoreProcedure,
    update: updateStoreProcedure,
    delete: deleteStoreProcedure,
    follow: followStoreProcedure,
    unfollow: unfollowStoreProcedure,
    getFollowed: getFollowedStoresProcedure,
    isFollowing: isFollowingStoreProcedure,
  }),
});

export type AppRouter = typeof appRouter;
