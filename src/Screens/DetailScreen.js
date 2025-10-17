import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, PermissionsAndroid, Platform, ScrollView, Share, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import colors from '../CommonFiles/Colors';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Entypo from 'react-native-vector-icons/Entypo';
import Ionicons from "react-native-vector-icons/Ionicons";
import { Colors } from 'react-native/Libraries/NewAppScreen';
import CheckBox from '@react-native-community/checkbox';
import Clipboard from '@react-native-clipboard/clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../utils/db';
import Geolocation from 'react-native-geolocation-service';
import { ENDPOINTS } from '../CommonFiles/Constant';
import Geocoder from 'react-native-geocoding';

const deleteVehiclesByIds = async (ids) => {
    if (!ids || ids.length === 0) return;

    // Helper to build contiguous ranges from ID list
    function buildRanges(ids) {
        ids.sort((a, b) => a - b);
        const ranges = [];
        let start = ids[0];
        let end = ids[0];

        for (let i = 1; i < ids.length; i++) {
            if (ids[i] === end + 1) {
                end = ids[i]; // extend range
            } else {
                ranges.push([start, end]);
                start = end = ids[i];
            }
        }
        ranges.push([start, end]); // last range
        return ranges;
    }

    const ranges = buildRanges(ids);
    let totalDeleted = 0;

    // Delete each range one by one
    for (const [start, end] of ranges) {
        await new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    `DELETE FROM vehicles WHERE id BETWEEN ? AND ?`,
                    [start, end],
                    () => {
                        totalDeleted += end - start + 1;
                        console.log(`🗑 Deleted vehicles ${start}–${end} (total deleted: ${totalDeleted})`);
                        resolve();
                    },
                    (_, error) => {
                        console.log("❌ Error deleting range:", error.message);
                        reject(error);
                    }
                );
            });
        });
    }

    console.log(`✅ Finished deleting ${totalDeleted} vehicles`);
};

const DetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { vehicleId } = route.params;
    console.log("vehicleid ye hai", vehicleId);
    const whatsapp = require('../assets/images/whatsapp.png');
    const Call = require('../assets/images/Call.png');
    const Copy = require('../assets/images/copy.png');
    const message = require('../assets/images/message.png');

    const [DetailModal, setDetailModal] = useState(false);
    const [modalType, setModalType] = useState('copy');  // "copy" ya "whatsapp"
    const [userType, setUsertype] = useState(null);
    const [vehicleData, setVehicleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [CallManagerModal, setCallManagerModal] = useState(false);
    const [deletesyncstatus, setDeleteSyncstatus] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userName, setUserName] = useState(null);
    const [userMobile, setUserMobile] = useState(null);
    const [location, setLocation] = useState(null);
    const [locationLoaded, setLocationLoaded] = useState(false);
    console.log("ye hai location latitude and longtitude", location);


    const [managerModalVisible, setManagerModalVisible] = useState(false);

    // Add this function to handle opening the manager modal
    const openManagerModal = () => {
        const hasManager1 = vehicleData.manager && vehicleData.manager.trim() !== '';
        const hasManager2 = vehicleData.manager2 && vehicleData.manager2.trim() !== '';
        const hasManager3 = vehicleData.manager3 && vehicleData.manager3.trim() !== '';

        if (!hasManager1 && !hasManager2 && !hasManager3) {
            if (Platform.OS === 'android') {
                ToastAndroid.show("No manager available", ToastAndroid.SHORT);
            } else {
                Alert.alert("Info", "No manager available");
            }
        } else {
            setManagerModalVisible(true);
        }
    };

    const [FinanceContactModal, setFinanceContactModal] = useState(false);
    const [financeNumbers, setFinanceNumbers] = useState([]);

    const openFinanceContactModal = () => {
        if (vehicleData?.finance_contact_number) {
            // Comma separated numbers ko array mein convert karein
            const numbersArray = vehicleData.finance_contact_number
                .split(',')
                .map(num => num.trim())
                .filter(num => num.length > 0);

            setFinanceNumbers(numbersArray);
            setFinanceContactModal(true);
        } else {
            Alert.alert("No Numbers", "No finance contact numbers available.");
        }
    };


    // Get user details from AsyncStorage
    const getUserDetails = async () => {
        try {
            const id = await AsyncStorage.getItem('staff_id');
            const name = await AsyncStorage.getItem('staff_name');
            const mobile = await AsyncStorage.getItem('staff_mobile');

            setUserId(id);
            setUserName(name);
            setUserMobile(mobile);
        } catch (error) {
            console.log('❌ Error getting user details:', error.message);
        }
    };



    const requestLocationPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: "Location Permission",
                        message: "App needs access to your location",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK"
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true; // iOS case
    };


    const getAddressFromCoords = async (latitude, longitude) => {
        try {
            const apiKey = 'AIzaSyA_ksjOCGFxVCnhjJ1Zj4BBhJIaD4nlpfM';
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK') {
                return data.results[0].formatted_address; // First result is usually the most accurate
            } else {
                console.log("❌ No address found");
                return "Unknown Address";
            }
        } catch (error) {
            console.log("❌ Error in reverse geocoding:", error.message);
            return "Unknown Address";
        }
    };


    const getCurrentLocation = async () => {
        const hasPermission = await requestLocationPermission();

        if (!hasPermission) {
            console.log("❌ Permission denied");
            return null;
        }

        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    console.log("✅ Location fetched:", latitude, longitude);
                    resolve({ latitude, longitude });
                },
                error => {
                    console.log("❌ Error getting location:", error.message);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 30000,
                    maximumAge: 10000,
                    forceRequestLocation: true,
                    showLocationDialog: true
                }
            );
        });
    };

    useEffect(() => {
        const fetchAndSendLocation = async () => {
            try {
                const location = await getCurrentLocation();
                if (location) {
                    const address = await getAddressFromCoords(location.latitude, location.longitude);
                    setLocation({
                        ...location,
                        address: address,
                    });
                    setLocationLoaded(true);
                }
            } catch (e) {
                ToastAndroid.show("⚠️ Location not found", ToastAndroid.SHORT);
                setLocation({ latitude: "0", longitude: "0", address: "Unknown Address" });
                setLocationLoaded(true);
            }
        };

        fetchAndSendLocation();
    }, []);


    // Send scan data to server based on user type
    const sendScanData = async () => {
        if (!vehicleData || !userId || !location) return;

        try {
            let url, payload;

            const date = new Date();
            const entry_date = date.getFullYear() + "-" +
                String(date.getMonth() + 1).padStart(2, '0') + "-" +
                String(date.getDate()).padStart(2, '0') + " " +
                String(date.getHours()).padStart(2, '0') + ":" +
                String(date.getMinutes()).padStart(2, '0') + ":" +
                String(date.getSeconds()).padStart(2, '0');

            if (userType === 'normal') {

                url = ENDPOINTS.store_vehicle_scan_data;



                payload = {
                    user_id: parseInt(userId),
                    user_name: userName,
                    user_mobile: userMobile,
                    vehicle: [
                        {
                            id: vehicleData?.id.toString(),
                            registration_number: vehicleData?.registration_number || "",
                            agreement_no: vehicleData?.agreement_number || "",
                            entry_date: entry_date,
                            location: location.address || "Scanned Location",
                            latitude: location.latitude,
                            longitude: location.longitude
                        }
                    ]
                };
                console.log("normal wala hai payload", payload);


            } else {
                console.log("usertype noram hai yar", userType);
                url = ENDPOINTS.store_full_vehicle_scan_data;
                console.log("usertype url hai yar", url);
                payload = {
                    user_id: parseInt(userId),
                    vehicle: [
                        {
                            id: vehicleData?.id.toString(),
                            month: vehicleData?.month || "",
                            finance_name: vehicleData?.finance_name || "",
                            manager: vehicleData?.manager || "",
                            branch: vehicleData?.branch || "",
                            agreement_number: vehicleData?.agreement_number || "",
                            app_id: vehicleData?.app_id || "",
                            customer_name: vehicleData?.customer_name || "",
                            bucket: vehicleData?.bucket || "",
                            emi: vehicleData?.emi || "",
                            principle_outstanding: vehicleData?.principle_outstanding || "",
                            total_outstanding: vehicleData?.total_outstanding || "",
                            product: vehicleData?.product || "",
                            fild_fos: vehicleData?.fild_fos || "",
                            registration_number: vehicleData?.registration_number || "",
                            chassis_number: vehicleData?.chassis_no || "",
                            engine_number: vehicleData?.engine_no || "",
                            repo_fos: vehicleData?.repo_fos || "",
                            entry_date: entry_date,
                            location: location.address || "Scanned Location",
                            latitude: location.latitude,
                            longitude: location.longitude
                        }
                    ]
                };

            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.code === 200) {
                console.log('✅ Scan data sent successfully');
                // ToastAndroid.show('Data Store Successfully', ToastAndroid.SHORT);
            } else {
                console.log('❌ Error sending scan data:', result.message);
            }
        } catch (error) {
            console.log('❌ Error sending scan data:', error.message);
        }
    };

    const UserWiseExpiryApi = async () => {
        const userId = await AsyncStorage.getItem('staff_id');
        if (!userId) {
            console.log("❌ User ID not found");
            return;
        }

        try {
            const response = await fetch(`${ENDPOINTS.UserWiseExpiry}?user_id=${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (result.code == 200 && result.payload) {
                const deletesync = result.payload.staff_delete_sync_status;

            } else {
                console.log('❌ Error: Failed to load data');
            }
        } catch (error) {
            console.log('❌ Error fetching data:', error.message);
        }
    };

    useEffect(() => {
        UserWiseExpiryApi(); // call on app start
        getUserDetails();
        getCurrentLocation();
        // searchByLastRegNo();
    }, []);




    useEffect(() => {
        // Send scan data only when ALL required data is available
        console.log("🚀 All data available", vehicleData, userId, locationLoaded, userType, location);
        if (vehicleData && userId && locationLoaded && userType && location) {
            console.log("🚀 All data available, sending scan data");
            sendScanData();
        } else {

        }
    }, [vehicleData, userId, locationLoaded, userType, location]);

    const loadDeletedVehiclesPaginated = async () => {
        let offset = 1;
        let keepLoading = true;
        let totalRecordsFetched = 0;
        let allDeletedIds = [];

        try {
            const userId = await AsyncStorage.getItem('staff_id');

            if (!userId) {
                console.log("❌ User ID not found");
                return;
            }

            const endpoint = ENDPOINTS.delete_vehicle_list;

            while (keepLoading) {
                const url = `${endpoint}?user_id=${userId}&offset=${offset}`;
                const response = await fetch(url);
                const result = await response.json();

                if (result.code == 200 && result.hasData !== 'nodata' && Array.isArray(result.payload)) {
                    const ids = result.payload.map(v => parseInt(v.id));
                    allDeletedIds = [...allDeletedIds, ...ids];
                    totalRecordsFetched += ids.length;
                    console.log(`🗑 Offset ${offset} → Received ${ids.length} deleted records`);
                    offset += 1;
                } else {
                    keepLoading = false;
                    console.log("✅ All deleted vehicles loaded.");
                }
                if (allDeletedIds.length > 0) {
                    await deleteVehiclesByIds(allDeletedIds);
                }
            }
        } catch (error) {
            console.log("❌ Error while loading deleted vehicles:", error.message);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            let usertype = null;

            const fetchUsertype = async () => {
                usertype = await AsyncStorage.getItem('user_type');
                setUsertype(usertype);
            };

            fetchUsertype();
        }, []),
    );

    // ✅ Fetch vehicle from SQLite
    useEffect(() => {
        if (!vehicleId) {
            console.log("⏩ No vehicleId provided, skipping fetch.");
            return;
        }

        db.transaction(tx => {
            tx.executeSql(
                `SELECT * FROM vehicles WHERE id = ?`,
                [vehicleId],
                (tx, results) => {
                    console.log("✅ Query executed successfully. Row count:", results.rows.length);

                    if (results.rows.length > 0) {
                        const vehicle = results.rows.item(0);
                        // console.log("📦 Vehicle data fetched:", vehicle);
                        setVehicleData(vehicle);
                    } else {
                        console.log("⚠️ No vehicle found with ID:", vehicleId);
                    }

                    setLoading(false);
                },
                (error) => {
                    console.log("❌ Error fetching vehicle by id:", error.message);
                    setLoading(false);
                }
            );
        });
    }, [vehicleId]);

    const allowedFieldsForNormal = [
        { label: 'RC NUMBER', key: 'registration_number' },
        { label: 'ENGINE NUMBER', key: 'engine_no' },
        { label: 'CHASSIS NUMBER', key: 'chassis_no' },
        { label: 'FINANCE NAME', key: 'finance_name' },
        { label: 'PRODUCT', key: 'product' },
        { label: 'CUSTOMER NAME', key: 'customer_name' },


        // { label: 'FINANCE CONTACT PERSON NAME', key: 'finance_contact_person_name' },
        // { label: 'FINANCE CONTACT NUMBER', key: 'finance_contact_number' }
    ];

    const fields = userType === 'normal'
        ? allowedFieldsForNormal.map(item => ({
            label: item.label,
            value: vehicleData?.[item.key] || '---'
        }))
        : [
            { label: 'BANK', value: vehicleData?.bank },
            { label: 'BRANCH', value: vehicleData?.branch },
            { label: 'LOAN NUMBER', value: vehicleData?.agreement_number },
            { label: 'CUSTOMER NAME', value: vehicleData?.customer_name },
            { label: 'RC NUMBER', value: vehicleData?.registration_number },
            { label: 'CHASSIS NUMBER', value: vehicleData?.chassis_no },
            { label: 'ENGINE NUMBER', value: vehicleData?.engine_no },
            { label: 'MODEL', value: vehicleData?.product },
            { label: 'BUCKET', value: vehicleData?.bucket },
            { label: 'EMI', value: vehicleData?.emi },
            { label: 'PRINCIPLE OUTSTANDING', value: vehicleData?.principle_outstanding },
            { label: 'TOTAL OUTSTANDING', value: vehicleData?.total_outstanding },
            // 👇 yahan managers ko directly add kar diya
            {
                label: 'MANAGER 1',
                name: vehicleData?.manager,
                number: vehicleData?.manager_number
            },
            {
                label: 'MANAGER 2',
                name: vehicleData?.manager2,
                number: vehicleData?.manager_number2
            },
            {
                label: 'MANAGER 3',
                name: vehicleData?.manager3,
                number: vehicleData?.manager_number3
            },


            { label: 'REGION', value: vehicleData?.region },
            { label: 'MAILER NAME', value: vehicleData?.mailer_name },
            { label: 'MAILER NUMBER', value: vehicleData?.mailer_number },


        ];

    const [selectedFields, setSelectedFields] = useState({});
    const [isAllSelected, setIsAllSelected] = useState(false);

    const toggleSelection = (label) => {
        setSelectedFields((prev) => {
            const updatedFields = { ...prev };
            if (updatedFields[label]) {
                // Agar already selected hai to deselect kar do
                delete updatedFields[label];
            } else {
                // Naya select karte waqt add kar do
                updatedFields[label] = true;
            }
            return updatedFields;
        });
    };




    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedFields({});
        } else {
            const allSelected = fields.reduce((acc, item) => {
                acc[item.label] = true;
                return acc;
            }, {});
            setSelectedFields(allSelected);
        }
        setIsAllSelected(!isAllSelected);  // ✅ Toggling the checkbox
    };

    const handleCopy = () => {
        const selectedData = fields
            .filter(item => selectedFields[item.label])
            .map(item => `*${item.label}* : ${item.value}`)
            .join('\n');

        if (selectedData) {
            Clipboard.setString(selectedData);
            ToastAndroid.show("Field Copied", ToastAndroid.SHORT);
        } else {
            // Alert.alert('No Fields Selected', 'Please select at least one field to copy.');
        }

        closeModal();
    };

    const handleWhatsApp = async (sendAll = false) => {

        const useAll = sendAll || isAllSelected;

        const selectedData = fields
            .filter(item => useAll || selectedFields[item.label])
            .map(item => `*${item.label}*: ${item.value}`)
            .join('\n');

        if (selectedData) {
            // Copy to clipboard
            Clipboard.setString(selectedData);

            // WhatsApp open karne ka code
            const messageContent = `\n${selectedData}`;
            try {
                const url = `whatsapp://send?text=${encodeURIComponent(messageContent)}`;
                const supported = await Linking.canOpenURL(url);

                if (supported) {
                    await Linking.openURL(url);
                } else {
                    const fallbackUrl = `https://wa.me/?text=${encodeURIComponent(messageContent)}`;
                    await Linking.openURL(fallbackUrl);
                }
            } catch (error) {
                console.error('Error sending message:', error);
                Alert.alert('Error', 'There was an issue sending the message.');
            }
        } else {
            Alert.alert('No Fields Selected', 'Please select at least one field to send.');
        }

        closeModal();
    };

    const onShareDetails = async (sendAll = false) => {
        try {
            const useAll = sendAll || isAllSelected;

            const selectedData = fields
                .filter(item => useAll || selectedFields[item.label])
                .map(item => `${item.label}: ${item.value}`)
                .join('\n');

            if (!selectedData) {
                Alert.alert('No Fields Selected', 'Please select at least one field to share.');
                return;
            }

            const result = await Share.share({
                message: 'Here are the vehicle details:\n' + selectedData,
            });

            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    console.log("Shared with activity type:", result.activityType);
                } else {
                    console.log("Shared successfully");
                }
            } else if (result.action === Share.dismissedAction) {
                console.log("Share dismissed");
            }
        } catch (error) {
            console.error(error.message);
        }

        closeModal();
    };

    const openModal = (type) => {
        if (userType == 'normal' && type == 'whatsapp') {
            // Directly send all fields to WhatsApp
            handleWhatsApp(true); // pass true for "send all"
        } else if (userType == 'normal' && type == 'share') {
            // Directly share all fields
            onShareDetails(true);
        } else {
            setModalType(type);
            setIsAllSelected(true);  // ✅ Checkbox ko checked karne ke liye
            const allSelected = fields.reduce((acc, item) => {
                acc[item.label] = true;
                return acc;
            }, {});
            setSelectedFields(allSelected);
            setDetailModal(true);
        }
    };

    const closeModal = () => {
        setDetailModal(false);
        setSelectedFields({});  // Deselect all fields
    };

    const handlePhoneCall = (phoneNumber) => {
        if (!phoneNumber) {
            Alert.alert("Invalid Number", "No phone number provided.");
            return;
        }

        const phone = phoneNumber.replace(/\D/g, '');

        if (phone.length > 0) {
            Linking.openURL(`tel:${phone}`)
                .catch(() => Alert.alert("Error", "Failed to make a call."));
        } else {
            Alert.alert("Invalid Number", "Phone number is empty or invalid.");
        }
    };

    const SecondPhoneSMS = (phoneNumber, message = "") => {
        if (!phoneNumber) {
            Alert.alert("Invalid Number", "No phone number provided.");
            return;
        }

        const phone = phoneNumber.replace(/\D/g, "");

        if (phone.length > 0) {
            const url = `sms:${phone}${message ? `?body=${encodeURIComponent(message)}` : ""}`;
            Linking.openURL(url)
                .catch(() => Alert.alert("Error", "Failed to send SMS."));
        } else {
            Alert.alert("Invalid Number", "Phone number is empty or invalid.");
        }
    };



    const createVehicleMessage = (vehicleData) => {
        if (!vehicleData) return '';

        const allowedFieldsForNormal = [
            { label: 'RC NUMBER', key: 'registration_number' },
            { label: 'ENGINE NUMBER', key: 'engine_no' },
            { label: 'CHASSIS NUMBER', key: 'chassis_no' },
            { label: 'FINANCE NAME', key: 'finance_name' },
            { label: 'PRODUCT', key: 'product' },
            { label: 'CUSTOMER NAME', key: 'customer_name' },
        ];

        const alwaysIncludedFields = [
            { label: 'Agency Name', value: vehicleData.finance_name || '-' },
            { label: 'Agency Contact', value: vehicleData.finance_contact_person_name || '-' },
            { label: 'Agency Number', value: vehicleData.finance_contact_number || '-' },
        ];

        const normalData = allowedFieldsForNormal
            .map(item => `${item.label}: *${vehicleData[item.key] || '-'}*`)
            .join('\n');

        const alwaysIncludedData = alwaysIncludedFields
            .map(item => `${item.label}: *${item.value}*`)
            .join('\n');



        return `${normalData}\n${alwaysIncludedData}`;
    };


    const SecondPhoneWhatsApp = (phoneNumber, vehicleData) => {
        if (!phoneNumber) {
            Alert.alert("Invalid Number", "No phone number provided.");
            return;
        }

        const message = createVehicleMessage(vehicleData);
        const phone = phoneNumber.replace(/\D/g, "");

        if (phone.length > 0) {
            const whatsappNumber = phone.startsWith('91') ? phone : `91${phone}`;
            const url = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;

            Linking.openURL(url).catch(() => {
                // fallback web version
                const webUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                Linking.openURL(webUrl).catch(() => Alert.alert("Error", "Failed to open WhatsApp."));
            });
        } else {
            Alert.alert("Invalid Number", "Phone number is empty or invalid.");
        }
    };


    const SecondPhoneWhatsAppNoNumber = (vehicleData) => {
        try {
            const message = createVehicleMessage(vehicleData);

            // Prefer web link (official supported way without number)
            const webUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

            Linking.openURL(webUrl)
                .then(() => {
                    ToastAndroid.show('Opening WhatsApp...', ToastAndroid.SHORT);
                })
                .catch((err) => {
                    console.error("WhatsApp open error:", err);
                    Alert.alert("Error", "Failed to open WhatsApp.");
                });

            // Optional: copy to clipboard
            Clipboard.setString(message);

        } catch (error) {
            console.error("WhatsApp message error:", error);
            Alert.alert("Error", "Something went wrong while preparing the message.");
        }
    };



    const ThirdPhoneCall = (phoneNumber) => {
        console.log("called", phoneNumber);

        if (!phoneNumber || typeof phoneNumber !== 'string') {
            Alert.alert("Invalid Number", "No valid phone number provided.");
            return;
        }

        const phone = phoneNumber.replace(/\D/g, ''); // Remove non-digits

        if (phone.length > 0) {
            Linking.openURL(`tel:${phone}`)
                .catch(() => Alert.alert("Error", "Failed to make a call."));
        } else {
            Alert.alert("Invalid Number", "Phone number is empty or invalid.");
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.Brown} />
            </View>
        );


    }

    const handleShare = async () => {
        try {

            const alwaysIncludedFields = [
                { label: 'Agency Name', value: vehicleData.finance_name },
                { label: 'Agency Contact', value: vehicleData.finance_contact_person_name },
                { label: 'Agency Email', value: vehicleData.finance_contact_number },
            ];

            // Process always included fields
            const alwaysIncludedData = alwaysIncludedFields
                .map(item => `${item.label}: ${item.value || '-'}`)
                .join('\n');

            const filteredFields = fields.filter(item => {
                if (userType === 'SubAdmin' && vehicleData.owner_type === 'owner' && item.label.includes('MANAGER')) {
                    return false; // Exclude MANAGER fields for SubAdmin with owner type
                }
                return true;
            });

            const allData = filteredFields
                .map(item => {
                    // Handle manager fields differently
                    const value = item.value || '-';
                    // Handle manager fields differently
                    if (item.label.includes('MANAGER')) {
                        const name = item.name || '-';
                        return `${item.label}: ${name} - ${item.number}`;
                    } else {
                        return `${item.label}: ${value}`;
                    }
                })
                .join('\n');

            if (allData) {
                const staticMessage = `*Respected Sir*,\nA vehicle has been traced out by our ground team. \nThe details of the vehicle and customer are as below.\n\n`;

                // Copy to clipboard
                Clipboard.setString(`${staticMessage}${allData}\n${alwaysIncludedData}`);

                // Share via native share dialog
                const sharedContent = `${staticMessage}${allData}\n${alwaysIncludedData}`;
                const result = await Share.share({
                    message: sharedContent,
                    title: 'Share Vehicle Details',
                });

                if (result.action === Share.sharedAction) {
                    if (result.activityType) {
                        console.log('Shared with', result.activityType);
                    } else {
                        console.log('Shared successfully');

                    }
                } else if (result.action === Share.dismissedAction) {
                    console.log('Share dismissed');
                }
            } else {
                Alert.alert('Error', 'No data available to share.');
            }
        } catch (error) {
            console.error('Share error:', error);
            Alert.alert('Error', 'There was an issue sharing the details.');
        }
    };

    const handleShareForNormal = async () => {
        try {
            if (!vehicleData) {
                Alert.alert('Error', 'No vehicle data available to share.');
                return;
            }

            // Normal user ke liye allowed fields
            const allowedFieldsForNormal = [
                { label: 'RC NUMBER', key: 'registration_number' },
                { label: 'ENGINE NUMBER', key: 'engine_no' },
                { label: 'CHASSIS NUMBER', key: 'chassis_no' },
                { label: 'FINANCE NAME', key: 'finance_name' },
                { label: 'PRODUCT', key: 'product' },
                { label: 'CUSTOMER NAME', key: 'customer_name' },
            ];

            // Always included fields for normal user
            const alwaysIncludedFields = [
                { label: 'Agency Name', value: vehicleData.finance_name || '-' },
                { label: 'Agency Contact', value: vehicleData.finance_contact_person_name || '-' },
                { label: 'Agency Number', value: vehicleData.finance_contact_number || '-' },
            ];

            // Process allowed fields
            const normalData = allowedFieldsForNormal
                .map(item => `${item.label}: *${vehicleData[item.key] || '-'}*`)
                .join('\n');

            // Process always included fields
            const alwaysIncludedData = alwaysIncludedFields
                .map(item => `${item.label}: *${item.value}*`)
                .join('\n');

            if (normalData) {


                const shareContent = `${normalData}\n${alwaysIncludedData}`;

                // Copy to clipboard
                Clipboard.setString(shareContent);

                // Share via native share dialog
                const result = await Share.share({
                    message: shareContent,
                    title: 'Share Vehicle Details',
                });

                if (result.action === Share.sharedAction) {
                    if (result.activityType) {
                        console.log('Shared with', result.activityType);
                    } else {
                        console.log('Shared successfully');
                    }
                } else if (result.action === Share.dismissedAction) {
                    console.log('Share dismissed');
                }
            } else {
                Alert.alert('Error', 'No data available to share.');
            }
        } catch (error) {
            console.error('Share error:', error);
            Alert.alert('Error', 'There was an issue sharing the details.');
        }
    };







    const sendSMS = async (phoneNumber) => {
        try {
            if (!phoneNumber) {
                Alert.alert('Error', 'Phone number is required');
                return;
            }

            const alwaysIncludedFields = [
                { label: 'Agency Name', value: vehicleData.finance_name },
                { label: 'Agency Contact', value: vehicleData.finance_contact_person_name },
                { label: 'Agency Email', value: vehicleData.finance_contact_number },
            ];

            // Process always included fields
            const alwaysIncludedData = alwaysIncludedFields
                .map(item => `${item.label}: ${item.value || '-'}`)
                .join('\n');


            const filteredFields = fields.filter(item => {
                if (userType === 'SubAdmin' && vehicleData.owner_type === 'owner' && item.label.includes('MANAGER')) {
                    return false; // Exclude MANAGER fields for SubAdmin with owner type
                }
                return true;
            });

            const allData = filteredFields
                .map(item => {
                    // Handle manager fields differently
                    const value = item.value || '-';
                    // Handle manager fields differently
                    if (item.label.includes('MANAGER')) {
                        const name = item.name || '-';
                        return `${item.label}: ${name} - ${item.number}`;
                    } else {
                        return `${item.label}: ${value}`;
                    }
                })
                .join('\n');

            if (allData) {
                const staticMessage = `Respected Sir,\nA vehicle has been traced out by our ground team. \nThe details of the vehicle and customer are as below.\n\n`;

                const fullMessage = `${staticMessage}${allData}\n${alwaysIncludedData}`;

                // Copy to clipboard
                Clipboard.setString(fullMessage);

                // Send directly to SMS
                const phone = phoneNumber.replace(/\D/g, '');
                if (phone) {
                    const url = `sms:${phone}?body=${encodeURIComponent(fullMessage)}`;

                    // Check if SMS app is available
                    const supported = await Linking.canOpenURL(url);

                    if (supported) {
                        await Linking.openURL(url);
                        ToastAndroid.show('Opening messaging app...', ToastAndroid.SHORT);
                    } else {
                        Alert.alert('Error', 'Messaging app is not available');
                    }
                }
            } else {
                Alert.alert('Error', 'No data available to share.');
            }
        } catch (error) {
            console.error('SMS share error:', error);
            Alert.alert('Error', 'There was an issue sending SMS.');
        }
    };
    const sendSMSNormal = async (phoneNumber) => {
        try {
            if (!vehicleData) {
                Alert.alert('Error', 'No vehicle data available.');
                return;
            }

            if (!phoneNumber) {
                Alert.alert('Error', 'Phone number is required.');
                return;
            }

            // Fields allowed for normal user (same as handleShareForNormal)
            const allowedFieldsForNormal = [
                { label: 'RC NUMBER', key: 'registration_number' },
                { label: 'ENGINE NUMBER', key: 'engine_no' },
                { label: 'CHASSIS NUMBER', key: 'chassis_no' },
                { label: 'FINANCE NAME', key: 'finance_name' },
                { label: 'PRODUCT', key: 'product' },
                { label: 'CUSTOMER NAME', key: 'customer_name' },
            ];

            // Always included fields
            const alwaysIncludedFields = [
                { label: 'Agency Name', value: vehicleData.finance_name || '-' },
                { label: 'Agency Contact', value: vehicleData.finance_contact_person_name || '-' },
                { label: 'Agency Number', value: vehicleData.finance_contact_number || '-' },
            ];

            // Prepare allowed field message
            const normalData = allowedFieldsForNormal
                .map(item => `${item.label}: ${vehicleData[item.key] || '-'}`)
                .join('\n');

            // Prepare always included field message
            const alwaysIncludedData = alwaysIncludedFields
                .map(item => `${item.label}: ${item.value}`)
                .join('\n');

            // Final message

            const fullMessage = `${normalData}\n${alwaysIncludedData}`;

            // Copy to clipboard
            Clipboard.setString(fullMessage);

            // Sanitize phone number
            const phone = phoneNumber.replace(/\D/g, '');
            if (!phone) {
                Alert.alert('Error', 'Invalid phone number.');
                return;
            }

            // Build SMS URL
            const url = `sms:${phone}?body=${encodeURIComponent(fullMessage)}`;
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
                ToastAndroid.show('Opening messaging app...', ToastAndroid.SHORT);
            } else {
                Alert.alert('Error', 'Messaging app is not available.');
            }

        } catch (error) {
            console.error('SMS share error:', error);
            Alert.alert('Error', 'There was an issue sending SMS.');
        }
    };


    const sendWhatsApp = async (phoneNumber) => {
        try {
            if (!phoneNumber) {
                Alert.alert('Error', 'Phone number is required');
                return;
            }

            const alwaysIncludedFields = [
                { label: 'Agency Name', value: vehicleData.finance_name },
                { label: 'Agency Contact', value: vehicleData.finance_contact_person_name },
                { label: 'Agency Email', value: vehicleData.finance_contact_number },
            ];

            // Process always included fields
            const alwaysIncludedData = alwaysIncludedFields
                .map(item => `${item.label}: *${item.value || '-'}*`)
                .join('\n');




            const filteredFields = fields.filter(item => {
                if (userType === 'SubAdmin' && vehicleData.owner_type === 'owner' && item.label.includes('MANAGER')) {
                    return false; // Exclude MANAGER fields for SubAdmin with owner type
                }
                return true;
            });

            const allData = filteredFields
                .map(item => {
                    // Handle manager fields differently
                    const value = item.value || '-';
                    // Handle manager fields differently
                    if (item.label.includes('MANAGER')) {
                        const name = item.name || '-';
                        return `${item.label}: *${name}* - ${item.number}`;
                    } else {
                        return `${item.label}: *${value}*`;
                    }
                })
                .join('\n');

            if (allData) {
                const staticMessage = `*Respected Sir*,\nA vehicle has been traced out by our ground team. \nThe details of the vehicle and customer are as below.\n\n`;

                const fullMessage = `${staticMessage}${allData}\n${alwaysIncludedData}`;

                // Copy to clipboard
                Clipboard.setString(fullMessage);

                // Send directly to WhatsApp
                // Sirf numbers aur + rakhe
                const phone = phoneNumber.replace(/[^0-9+]/g, '');

                // Agar user number me country code nahi diya
                const phoneWithCode = phone.startsWith('+') ? phone : '+91' + phone;


                if (phone) {
                    const url = `whatsapp://send?phone=${phoneWithCode}&text=${encodeURIComponent(fullMessage)}`;

                    // Check if WhatsApp is installed
                    const supported = await Linking.canOpenURL(url);

                    if (supported) {
                        await Linking.openURL(url);
                        ToastAndroid.show('Opening WhatsApp...', ToastAndroid.SHORT);
                    } else {
                        // Fallback: open in browser
                        const fallbackUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(fullMessage)}`;
                        await Linking.openURL(fallbackUrl);
                    }
                }
            } else {
                Alert.alert('Error', 'No data available to share.');
            }
        } catch (error) {
            console.error('WhatsApp share error:', error);
            Alert.alert('Error', 'There was an issue sending to WhatsApp.');
        }
    };

    const sendWhatsAppNoNumber = async () => {
        try {
            // Always included fields
            const alwaysIncludedFields = [
                { label: 'Agency Name', value: vehicleData.finance_name },
                { label: 'Agency Contact', value: vehicleData.finance_contact_person_name },
                { label: 'Agency Email', value: vehicleData.finance_contact_number },
            ];

            const alwaysIncludedData = alwaysIncludedFields
                .map(item => `${item.label}: *${item.value || '-'}*`)
                .join('\n');

            // Filter fields (e.g., MANAGER fields for SubAdmin)
            const filteredFields = fields.filter(item => {
                if (userType === 'SubAdmin' && vehicleData.owner_type === 'owner' && item.label.includes('MANAGER')) {
                    return false;
                }
                return true;
            });

            // Map fields to message
            const allData = filteredFields
                .map(item => {
                    const value = item.value || '-';
                    if (item.label.includes('MANAGER')) {
                        const name = item.name || '-';
                        return `${item.label}: *${name}* - ${item.number}`;
                    } else {
                        return `${item.label}: *${value}*`;
                    }
                })
                .join('\n');

            if (allData) {
                const staticMessage = `*Respected Sir*,\nA vehicle has been traced out by our ground team. \nThe details of the vehicle and customer are as below.\n\n`;

                const fullMessage = `${staticMessage}${allData}\n${alwaysIncludedData}`;

                // Copy to clipboard
                Clipboard.setString(fullMessage);

                // WhatsApp URL without phone number (user selects contact)
                const url = `whatsapp://send?text=${encodeURIComponent(fullMessage)}`;
                const supported = await Linking.canOpenURL(url);

                if (supported) {
                    await Linking.openURL(url);
                    ToastAndroid.show('Opening WhatsApp...', ToastAndroid.SHORT);
                } else {
                    // Fallback to web version
                    const webUrl = `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
                    await Linking.openURL(webUrl);
                }
            } else {
                Alert.alert('Error', 'No data available to share.');
            }
        } catch (error) {
            console.error('WhatsApp share error:', error);
            Alert.alert('Error', 'There was an issue sending to WhatsApp.');
        }
    };




    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            {/* Header Section */}
            <View style={{ backgroundColor: colors.Brown, paddingVertical: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', }}>
                <TouchableOpacity style={{ position: 'absolute', top: 15, left: 15 }}
                    onPress={() => {
                        navigation.goBack();
                    }}>
                    <Feather name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', fontFamily: 'Inter-Bold', }}> Vehicle Details
                </Text>
                <View style={{ width: '25%', height: 50, justifyContent: 'center', alignItems: 'center', position: 'absolute', right: 10, top: 3, flexDirection: 'row', gap: 15, }}>
                    {/* <TouchableOpacity onPress={() => openModal('copy')}>
                        <Image source={Copy} style={{ width: 30, height: 30, tintColor: 'white' }} />
                    </TouchableOpacity> */}
                    {userType === 'normal' ? (
                        <TouchableOpacity onPress={() => SecondPhoneWhatsAppNoNumber(vehicleData)}>
                            <Image source={whatsapp} style={{ width: 25, height: 25 }} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={sendWhatsAppNoNumber}>
                            <Image source={whatsapp} style={{ width: 25, height: 25 }} />
                        </TouchableOpacity>
                    )}




                </View>

            </View>
            <ScrollView style={{ flex: 1, backgroundColor: 'white', margin: 10 }} keyboardShouldPersistTaps='handled' showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 3, borderWidth: 1, borderColor: '#ddd' }}>
                    {fields
                        .filter(
                            item =>
                                !(
                                    userType === 'SubAdmin' &&
                                    vehicleData.owner_type === 'owner' &&
                                    item.label.includes('MANAGER')
                                )
                        )
                        .map((item, index) => {
                            // 👇 Manager rows
                            if (item.label.includes('MANAGER')) {
                                if (!item.label && !item.name && !item.number) return null; // dono empty hai to skip karo

                                return (
                                    <View
                                        key={index}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            borderBottomWidth: 0.5,
                                            borderColor: '#ccc',
                                            paddingVertical: 5,
                                        }}
                                    >
                                        {/* Left: Label */}
                                        <View style={{ width: '40%' }}>
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontFamily: 'Inter-Regular',
                                                    padding: 6,
                                                    color: 'black',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {item.label}
                                            </Text>
                                        </View>

                                        {/* Middle: Name */}
                                        <View style={{ width: '30%' }}>
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontFamily: 'Inter-Bold',
                                                    color: 'black',
                                                }}
                                            >
                                                {item.name || '---'}
                                            </Text>
                                        </View>

                                        {/* Right: Number */}
                                        <View style={{ width: '30%' }}>
                                            {item.number ? (
                                                <TouchableOpacity onPress={() => handlePhoneCall(item.number)}>
                                                    <Text
                                                        style={{
                                                            fontSize: 11,
                                                            fontFamily: 'Inter-Regular',
                                                            color: 'blue',
                                                        }}
                                                    >
                                                        {item.number}
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        fontFamily: 'Inter-Regular',
                                                        color: 'black',
                                                    }}
                                                >
                                                    ---
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            }
                            // 👇 Special handling for MAILER NUMBER field
                            if (item.label === 'MAILER NUMBER') {
                                return (
                                    <View
                                        key={index}
                                        style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            borderBottomWidth: 0.5,
                                            borderColor: '#ccc',
                                            paddingVertical: 1.5,
                                        }}
                                    >
                                        <View
                                            style={{ width: '40%', justifyContent: 'center', alignItems: 'flex-start' }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontFamily: 'Inter-Regular',
                                                    padding: 6,
                                                    color: 'black',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {item.label}
                                            </Text>
                                        </View>

                                        <View style={{ width: '60%' }}>
                                            {item.value ? (
                                                <TouchableOpacity
                                                    style={{
                                                        borderRadius: 8,
                                                        padding: 6,
                                                        backgroundColor: 'white',
                                                    }}
                                                    onPress={() => handlePhoneCall(item.value)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={{
                                                            color: 'blue',
                                                            fontFamily: 'Inter-Regular',
                                                            flexWrap: 'wrap',
                                                            flex: 1,
                                                            lineHeight: 18,
                                                            fontSize: 11,
                                                        }}
                                                    >
                                                        {item.value}
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View
                                                    style={{
                                                        borderRadius: 8,
                                                        padding: 6,
                                                        backgroundColor: 'white',
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: 'black',
                                                            fontFamily: 'Inter-Bold',
                                                            flexWrap: 'wrap',
                                                            flex: 1,
                                                            lineHeight: 18,
                                                            fontSize: 11,
                                                        }}
                                                    >
                                                        ---
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            }

                            // 👇 Normal fields
                            return (

                                <View
                                    key={index}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        borderBottomWidth: 0.5,
                                        borderColor: '#ccc',
                                        paddingVertical: 1.5,
                                    }}
                                >
                                    <View
                                        style={{ width: '40%', justifyContent: 'center', alignItems: 'flex-start' }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                fontFamily: 'Inter-Regular',
                                                padding: 6,
                                                color: 'black',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {item.label}
                                        </Text>
                                    </View>

                                    <View style={{ width: '60%' }}>
                                        <TouchableOpacity
                                            style={{
                                                borderRadius: 8,
                                                padding: 6,
                                                backgroundColor: 'white',
                                            }}
                                            disabled={!item.value}
                                            activeOpacity={1}
                                        >
                                            <Text
                                                style={{
                                                    color: 'black',
                                                    fontFamily: 'Inter-Bold',

                                                    flexWrap: 'wrap',
                                                    flex: 1,
                                                    lineHeight: 18,
                                                    fontSize: 11,
                                                }}
                                            >
                                                {item.value || '---'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>


                                </View>







                            );


                        })}

                </View>
                {userType === 'normal' && (
                    <View style={{ borderWidth: 1, borderColor: '#ddd', marginTop: 10 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                borderBottomWidth: 0.5,
                                borderColor: '#ccc',
                                paddingVertical: 5,

                            }}
                        >
                            {/* Label */}
                            <View style={{ width: '40%', justifyContent: 'center', alignItems: 'flex-start' }}>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'Inter-Regular',
                                        padding: 6,
                                        color: 'black',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    AGENCY NAME
                                </Text>
                            </View>
                            <View style={{ width: '60%', justifyContent: 'center', alignItems: 'flex-start' }}>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'Inter-Bold',
                                        color: 'black',
                                    }}
                                >
                                    Rana Corporation
                                </Text>
                            </View>
                        </View>


                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                borderBottomWidth: 0.5,
                                borderColor: '#ccc',
                                paddingVertical: 5,
                            }}
                        >
                            {/* Label */}
                            <View style={{ width: '40%', justifyContent: 'center', alignItems: 'flex-start' }}>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'Inter-Regular',
                                        padding: 6,
                                        color: 'black',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    AGENCY EMAIL
                                </Text>
                            </View>
                            <View style={{ width: '60%', justifyContent: 'center', alignItems: 'flex-start' }}>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'Inter-Bold',
                                        color: 'black',
                                    }}
                                >
                                    ranacorporation.citi@gmail.com
                                </Text>
                            </View>
                        </View>

                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                borderBottomWidth: 0.5,
                                borderColor: '#ccc',
                                paddingVertical: 5,
                            }}
                        >
                            {/* Label */}
                            <View style={{ width: '40%', justifyContent: 'center', alignItems: 'flex-start' }}>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'Inter-Regular',
                                        padding: 6,
                                        color: 'black',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    AGENCY CONTACT
                                </Text>
                            </View>

                            {/* Clickable numbers */}
                            <View style={{ width: '60%', justifyContent: 'center', alignItems: 'flex-start' }}>
                                {['7016469141', '8141814596', '8866555391', '8733093303'].map((num, index) => (
                                    <TouchableOpacity key={index} onPress={() => Linking.openURL(`tel:${num}`)}>
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                fontFamily: 'Inter-Bold',
                                                color: 'blue',
                                                marginVertical: 2,
                                            }}
                                        >
                                            {num}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                    </View>
                )}
                {/* 
                <View style={{ marginTop: 10, borderWidth: 1, borderColor: '#ddd', }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, backgroundColor: '#ddd' }}>
                        <View style={{ width: '50%', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: 'black', fontFamily: 'Inter-Bold', fontSize: 12 }}>FINANCE PERSON</Text>
                        </View>
                        <View style={{ width: '50%', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: 'black', fontFamily: 'Inter-Bold', fontSize: 12 }}>FINANCE NUMBER</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                        <View style={{ width: '50%', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: 'black', fontFamily: 'Inter-Regular', fontSize: 14 }}>{vehicleData.finance_contact_person_name || '---'}</Text>
                        </View>
                        <View style={{ width: '50%', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 20 }}>
                      
                            <TouchableOpacity onPress={() => SecondPhoneCall(vehicleData.finance_contact_number)} >
                                <Text style={{ color: 'blue', fontFamily: 'Inter-Regular', fontSize: 14 }}>{vehicleData.finance_contact_number || '---'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View> */}


                {/* {userType === 'normal' && (
                    <View style={{
                        marginTop: 10,
                        borderWidth: 1,
                        borderColor: '#ddd',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 10
                    }}>

                        <Text style={{
                            color: 'black',
                            fontFamily: 'Inter-Regular',
                            fontSize: 12
                        }}>
                            CONFIRMATION NUMBER
                        </Text>

                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10
                        }}>
                            <Image source={Call} style={{ width: 20, height: 20 }} />
                            <TouchableOpacity onPress={() => ThirdPhoneCall('02656631816')}>
                                <Text style={{ color: 'blue', fontFamily: 'Inter-Regular', fontSize: 12 }}>
                                    02656631816
                                </Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                )} */}
            </ScrollView>
            <View style={{ marginBottom: 2, flexDirection: "row", justifyContent: "space-between", marginHorizontal: 10, }} >
                {/* Call Manager Button */}
                <TouchableOpacity onPress={userType === 'normal' ? openFinanceContactModal : () => openManagerModal()} style={{ backgroundColor: colors.Brown, width: "49%", paddingVertical: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", }} >
                    <Ionicons name="call" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={{ fontFamily: "Inter-Bold", fontSize: 14, color: "#fff", }} >
                        Call Manager
                    </Text>
                </TouchableOpacity>

                {/* Share Details Button */}
                <TouchableOpacity onPress={userType === 'normal' ? handleShareForNormal : handleShare} style={{ backgroundColor: "#e2a502", width: "49%", paddingVertical: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", }} >
                    <Ionicons name="share-social-sharp" size={20} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={{ fontFamily: "Inter-Bold", fontSize: 14, color: "#fff", }} >
                        Share Details
                    </Text>
                </TouchableOpacity>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={DetailModal}
                onRequestClose={closeModal}
            >
                <TouchableOpacity onPress={closeModal} style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', }}>

                    <View onStartShouldSetResponder={(e) => e.stopPropagation()} style={{ width: '100%', backgroundColor: '#fff', borderRadius: 10, height: '90%' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', backgroundColor: colors.Brown, padding: 10 }}>
                            <TouchableOpacity
                                style={{ justifyContent: 'center', alignItems: 'center' }}
                                onPress={closeModal}>
                                <Entypo name="cross" size={30} color="white" />
                            </TouchableOpacity>
                            <View style={{ justifyContent: 'center', alignItems: 'center', marginLeft: 7, }}>
                                <Text
                                    style={{
                                        color: 'white',
                                        fontFamily: 'Inter-Bold',
                                        fontSize: 14,

                                        textAlign: 'center',
                                    }}
                                >
                                    {/* {modalType === 'copy' ? 'Copy' : 'WhatsApp'} */}
                                    Copy vehicle Detail
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 7, justifyContent: 'flex-end', padding: 3, flex: 1 }}>
                                <CheckBox
                                    value={isAllSelected}
                                    onValueChange={toggleSelectAll}
                                    tintColors={{ true: 'white', false: '#ccc' }}
                                />
                                <Text style={{ marginLeft: 8, fontWeight: 'bold', color: 'white', fontFamily: 'Inter-Regular' }}>
                                    {'Select All'}
                                </Text>
                            </View>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: 'white' }} contentContainerStyle={{ paddingBottom: 10 }}>

                            {fields.map((item) => (
                                <View
                                    key={item.label}
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginVertical: 3,
                                        borderBottomWidth: 0.5,
                                        borderColor: '#ccc',
                                        paddingHorizontal: 10
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: 'black',
                                            flex: 1,
                                            fontFamily: 'Inter-Regular',
                                        }}
                                    >
                                        {item.label}
                                    </Text>

                                    <CheckBox
                                        value={selectedFields[item.label] || false}
                                        onValueChange={() => toggleSelection(item.label)}
                                        tintColors={{ true: colors.Brown, false: '#ccc' }}
                                    />
                                </View>
                            ))}

                        </ScrollView>
                        <View style={{ backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', padding: 10 }}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: selectedFields && Object.keys(selectedFields).length > 0 ? colors.Brown : '#ccc', // Grey when disabled
                                    paddingVertical: 8,
                                    paddingHorizontal: 30,
                                    borderRadius: 8,
                                    width: '100%',
                                    alignItems: 'center',
                                    alignSelf: 'center',

                                    flexDirection: 'row',
                                    justifyContent: 'center', gap: 10
                                }}
                                onPress={modalType === 'copy' ? handleCopy : modalType == 'whatsapp' ? handleWhatsApp : onShareDetails}
                                disabled={!(selectedFields && Object.keys(selectedFields).length > 0)}
                            >
                                {modalType === 'whatsapp' && (
                                    <Image
                                        source={whatsapp}
                                        style={{ width: 20, height: 20 }}
                                    />
                                )}
                                <Text
                                    style={{
                                        color: selectedFields && Object.keys(selectedFields).length > 0 ? '#fff' : 'grey',
                                        fontSize: 14,
                                        fontWeight: 'bold',
                                        fontFamily: 'Inter-Regular',
                                    }}
                                >
                                    {modalType == 'copy' ? 'Copy' : modalType == 'whatsapp' ? 'WhatsApp Send' : 'Share'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
            <Modal
                animationType="slide"
                transparent={true}
                visible={managerModalVisible}
                onRequestClose={() => setManagerModalVisible(false)}
            >
                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                    onPress={() => setManagerModalVisible(false)}
                    activeOpacity={1}
                >
                    <View
                        style={{
                            backgroundColor: 'white',

                            width: '90%',
                            maxHeight: '70%',
                            borderRadius: 10
                        }}
                        onStartShouldSetResponder={() => true}
                    >
                        {/* Modal Header */}
                        <View style={{
                            backgroundColor: '#CFCECE',
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingVertical: 10,
                            marginBottom: 15,
                            borderRadius: 5
                        }}>
                            <Text style={{
                                fontSize: 18,
                                fontWeight: 'bold',
                                color: 'black',
                                fontFamily: 'Inter-Bold'
                            }}>
                                Managers
                            </Text>
                        </View>

                        <ScrollView keyboardShouldPersistTaps='handled'>
                            {/* Manager 1 */}
                            {vehicleData.manager && vehicleData.manager.trim() !== '' && (
                                <View style={{ marginBottom: 20, padding: 10 }}>
                                    <View style={{
                                        flexDirection: 'row',

                                        marginBottom: 10,
                                        width: '100%'
                                    }}>
                                        <View style={{ width: '60%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Text style={{
                                                fontSize: 14,
                                                fontWeight: 'bold',
                                                color: 'black',
                                                fontFamily: 'Inter-Bold'
                                            }}>
                                                {vehicleData.manager}
                                            </Text>
                                        </View>
                                        <View style={{ width: '40%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {vehicleData.manager_number && (
                                                <Text style={{
                                                    fontSize: 14,
                                                    color: 'black',
                                                    fontFamily: 'Inter-Regular'
                                                }}>
                                                    {vehicleData.manager_number}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    {vehicleData.manager_number && (
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-around'
                                        }}>
                                            <TouchableOpacity
                                                onPress={() => handlePhoneCall(vehicleData.manager_number)}
                                                style={{ alignItems: 'center' }}
                                            >
                                                <Image source={Call} style={{ width: 24, height: 24 }} />

                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => userType === 'normal' ?
                                                    sendSMSNormal(vehicleData.manager_number) :
                                                    sendSMS(vehicleData.manager_number)}
                                                style={{ alignItems: 'center' }}
                                            >
                                                <Image source={message} style={{ width: 24, height: 24 }} />

                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => sendWhatsApp(vehicleData.manager_number)}
                                                style={{ alignItems: 'center' }}
                                            >
                                                <Image source={whatsapp} style={{ width: 24, height: 24 }} />

                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {!vehicleData.manager_number && (
                                        <Text style={{ textAlign: 'center', color: 'gray', fontStyle: 'italic' }}>
                                            No phone number available
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* Manager 2 */}
                            {vehicleData.manager2 && vehicleData.manager2.trim() !== '' && (
                                <View style={{ marginBottom: 20 }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        width: '100%',
                                        marginBottom: 10
                                    }}>
                                        <View style={{ width: '60%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Text style={{
                                                fontSize: 14,
                                                fontWeight: 'bold',
                                                color: 'black',
                                                fontFamily: 'Inter-Bold',

                                            }}>
                                                {vehicleData.manager2}
                                            </Text>
                                        </View>
                                        <View style={{ width: '40%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {vehicleData.manager_number2 && (
                                                <Text style={{
                                                    fontSize: 14,
                                                    color: 'black',
                                                    fontFamily: 'Inter-Regular'
                                                }}>
                                                    {vehicleData.manager_number2}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    {vehicleData.manager_number2 && (
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-around'
                                        }}>
                                            <TouchableOpacity
                                                onPress={() => handlePhoneCall(vehicleData.manager_number2)}
                                                style={{ alignItems: 'center' }}
                                            >
                                                <Image source={Call} style={{ width: 24, height: 24 }} />

                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => userType === 'normal' ?
                                                    sendSMSNormal(vehicleData.manager_number2) :
                                                    sendSMS(vehicleData.manager_number2)}
                                                style={{ alignItems: 'center' }}
                                            >
                                                <Image source={message} style={{ width: 24, height: 24 }} />

                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => sendWhatsApp(vehicleData.manager_number2)}
                                                style={{ alignItems: 'center' }}
                                            >
                                                <Image source={whatsapp} style={{ width: 24, height: 24 }} />

                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {!vehicleData.manager_number2 && (
                                        <Text style={{ textAlign: 'center', color: 'gray', fontStyle: 'italic' }}>
                                            No phone number available
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* Manager 3 */}
                            {vehicleData.manager3 && vehicleData.manager3.trim() !== '' && (
                                <View style={{ marginBottom: 20 }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        width: '100%',
                                        marginBottom: 10
                                    }}>
                                        <View style={{ width: '60%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Text style={{
                                                fontSize: 14,
                                                fontWeight: 'bold',
                                                color: 'black',
                                                fontFamily: 'Inter-Bold'
                                            }}>
                                                {vehicleData.manager3}
                                            </Text>
                                        </View>
                                        <View style={{ width: '40%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {vehicleData.manager_number3 && (
                                                <Text style={{
                                                    fontSize: 14,
                                                    color: 'black',
                                                    fontFamily: 'Inter-Regular'
                                                }}>
                                                    {vehicleData.manager_number3}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    {vehicleData.manager_number3 && (
                                        <View style={{
                                            flexDirection: 'row',
                                            justifyContent: 'space-around'
                                        }}>
                                            <TouchableOpacity
                                                onPress={() => handlePhoneCall(vehicleData.manager_number3)}
                                                style={{ alignItems: 'center' }}
                                            >
                                                <Image source={Call} style={{ width: 24, height: 24 }} />

                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => userType === 'normal' ?
                                                    sendSMSNormal(vehicleData.manager_number3) :
                                                    sendSMS(vehicleData.manager_number3)}
                                                style={{ alignItems: 'center' }}
                                            >
                                                <Image source={message} style={{ width: 24, height: 24 }} />

                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => sendWhatsApp(vehicleData.manager_number3)}
                                                style={{ alignItems: 'center' }}
                                            >
                                                <Image source={whatsapp} style={{ width: 24, height: 24 }} />

                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {!vehicleData.manager_number3 && (
                                        <Text style={{ textAlign: 'center', color: 'gray', fontStyle: 'italic' }}>
                                            No phone number available
                                        </Text>
                                    )}
                                </View>
                            )}

                            {/* No Managers Case */}
                            {!vehicleData.manager && !vehicleData.manager2 && !vehicleData.manager3 && (
                                <Text style={{
                                    textAlign: 'center',
                                    color: 'gray',
                                    fontStyle: 'italic',
                                    marginVertical: 20
                                }}>
                                    No managers available
                                </Text>
                            )}
                        </ScrollView>


                        {/* Close Button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: 'white',

                                padding: 12,
                                borderRadius: 8,
                                marginTop: 15,
                                alignItems: 'flex-end',
                                justifyContent: 'flex-end'
                            }}
                            activeOpacity={1}

                        >
                            <TouchableOpacity onPress={() => setManagerModalVisible(false)}>
                                <Text style={{
                                    color: 'red',
                                    fontSize: 16,
                                    fontWeight: 'bold',
                                    fontFamily: 'Inter-Regular'
                                }}>
                                    Close
                                </Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>


            <Modal
                animationType="slide"
                transparent={true}
                visible={FinanceContactModal}
                onRequestClose={() => setFinanceContactModal(false)}
            >
                <TouchableOpacity
                    onPress={() => setFinanceContactModal(false)}
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)'
                    }}
                >
                    <View style={{
                        backgroundColor: '#fff',

                        minWidth: '85%',
                        borderRadius: 10
                    }}
                        onStartShouldSetResponder={() => true} // Prevent modal from closing on content click
                        onTouchEnd={e => e.stopPropagation()}>
                        <Text style={{
                            textAlign: 'center',
                            fontSize: 18,
                            fontWeight: 'bold',
                            marginBottom: 15,
                            color: '#777',
                            fontFamily: 'Inter-Regular',
                            backgroundColor: '#ddd'
                            , paddingVertical: 3
                        }}>
                            Agencies
                        </Text>

                        {financeNumbers.map((number, index) => (
                            <View key={index} style={{ marginVertical: 0 }}>
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginBottom: 5,
                                    gap: 5
                                }}>
                                    <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: 'red', }}>Agency No{index + 1}:-</Text>
                                    <Text style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: 'red' }}>{number}</Text>
                                </View>

                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-around',
                                    marginTop: 5,
                                    borderBottomWidth: 1,
                                    borderColor: '#ddd'
                                }}>
                                    <TouchableOpacity
                                        onPress={() => handlePhoneCall(number)}
                                        style={{
                                            alignItems: 'center',
                                            paddingHorizontal: 10,
                                            paddingVertical: 5,
                                            // backgroundColor: '#f0f0f0',
                                            borderRadius: 5,
                                            flex: 1,
                                            marginHorizontal: 5
                                        }}
                                    >
                                        <FontAwesome name={'phone'} color={'#1f97f1'} size={20} />
                                        {/* <Text style={{ fontSize: 12, marginTop: 5 }}>Call</Text> */}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => sendSMSNormal(number)}
                                        style={{
                                            alignItems: 'center',
                                            paddingHorizontal: 10,
                                            paddingVertical: 5,
                                            // backgroundColor: '#f0f0f0',
                                            borderRadius: 5,
                                            flex: 1,
                                            marginHorizontal: 5
                                        }}
                                    >
                                        <Entypo name={'mail'} color={'#1f97f1'} size={20} />
                                        {/* <Text style={{ fontSize: 12, marginTop: 5 }}>SMS</Text> */}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => SecondPhoneWhatsApp(number, vehicleData)}
                                        style={{
                                            alignItems: 'center',
                                            paddingHorizontal: 10,
                                            paddingVertical: 5,
                                            // backgroundColor: '#f0f0f0',
                                            borderRadius: 5,
                                            flex: 1,
                                            marginHorizontal: 5
                                        }}
                                    >
                                        <Image source={whatsapp} style={{ height: 20, width: 20 }} />
                                        {/* <Text style={{ fontSize: 12, marginTop: 5 }}>WhatsApp</Text> */}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {/* Close Button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: 'white',

                                padding: 12,
                                borderRadius: 8,
                                marginTop: 15,
                                alignItems: 'flex-end',
                                justifyContent: 'flex-end'
                            }}
                            activeOpacity={1}

                        >
                            <TouchableOpacity onPress={() => setFinanceContactModal(false)}>
                                <Text style={{
                                    color: 'red',
                                    fontSize: 16,
                                    fontWeight: 'bold',
                                    fontFamily: 'Inter-Regular'
                                }}>
                                    Close
                                </Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

        </View >
    )
}

export default DetailScreen

const styles = StyleSheet.create({})