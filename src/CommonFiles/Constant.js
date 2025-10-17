// export const BASE_URL = 'https://admin.easyreppo.in/new_api_dev/';
// export const BASE_URL = 'https://easyreppo.com/admin/api-1.1/';
// export const BASE_URL = 'https://easyreppo.shivayphoto.com/admin/api-1.1/';
// export const BASE_URL = 'https://easyreppo.webmastersinfotech.in/admin/api-1.1/';
export const BASE_URL = 'https://ranacorporation.webmastersinfotech.com/admin/api/';



export const ENDPOINTS = {
  LOGIN: `${BASE_URL}login.php`,
  List_Staff: `${BASE_URL}list_staff.php`,
  Add_Staff: `${BASE_URL}add_staff.php`,
  Staff_Schedule_List: `${BASE_URL}list_schedule.php`,
  Add_Schedule: `${BASE_URL}add_schedule.php`,
  Search_History: `${BASE_URL}search_history.php`,
  Delete_Staff: `${BASE_URL}delete_staff.php`,
  Update_Staff: `${BASE_URL}update_staff.php`,
  Delete_Schedule: `${BASE_URL}delete_schedule.php`,
  Update_Schedule: `${BASE_URL}update_schedule.php`,
  Intimation_Vehicle: `${BASE_URL}intimation_vehicle.php`,
  Add_Intimation: `${BASE_URL}add_intimation.php`,
  Search_Schedule: `${BASE_URL}search_schedule.php`,
  Area_list: `${BASE_URL}area_list.php`,
  Add_Area: `${BASE_URL}add_area.php`,
  Intimation_List: `${BASE_URL}intimation_list.php`,
  Delete_Area: `${BASE_URL}delete_area.php`,
  Update_Area: `${BASE_URL}update_area.php`,
  Mail_Send_Pdf: `${BASE_URL}mail_send_pdf.php`,
  UserWiseExpiry: `${BASE_URL}user_wise_expiry.php`,
  FullVehicleDetails: `${BASE_URL}full_vehicle_detail_list.php`,
  List_Staff_Profile: (userId) => `${BASE_URL}profile.php?user_id=${userId}`,
  update_profile_img: `${BASE_URL}update_profile.php`,
  dummy_data: `${BASE_URL}dummy_data.php`,
  store_vehicle_scan_data: `${BASE_URL}store_vehicle_scan_data.php`,
  store_full_vehicle_scan_data: `${BASE_URL}store_full_vehicle_scan_data.php`,
  VehicleList_Normal: `${BASE_URL}vehicle_list.php`,
  VehicleList_Full: `${BASE_URL}full_vehicle_detail_list.php`,
  delete_vehicle_list: `${BASE_URL}delete_vehicle_list.php`,
  app_setting_time: `${BASE_URL}app_setting_time.php`,

  ICard: (userId, type) => `${BASE_URL}icard.php?user_id=${userId}&type=${type}`,



};