import { ActivityIndicator, FlatList, Image, Modal, ScrollView, StyleSheet, Text, ToastAndroid, TouchableOpacity, View, TextInput, NativeModules, Platform } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import colors from '../CommonFiles/Colors'
import Bottomtab from '../Component/Bottomtab';
import { db, initDB, insertVehicle, getVehiclesPaginated, bulkInsertVehicles } from '../utils/db';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Entypo from 'react-native-vector-icons/Entypo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Progress from 'react-native-progress';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import KeepAwake from 'react-native-keep-awake';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LocationAndNetworkChecker from '../CommonFiles/LocationAndNetworkChecker';
import { Checkbox } from "react-native-paper";
import { ENDPOINTS } from '../CommonFiles/Constant';

const { ForegroundService } = NativeModules;

const SettingScreen = () => {
    const Grid = require('../assets/images/Grid.png');
    const List = require('../assets/images/List.png');
    const reLoad = require('../assets/images/reload.png');

    const [SelectedDropdownItem, setSelectedDropdownItem] = useState('List');
    const [totalItems, setTotalItems] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [listType, setListType] = useState('List');
    const [selectedOption, setSelectedOption] = useState('List');

    const [loadingDone, setLoadingDone] = useState(true);
    const [progressPercent, setProgressPercent] = useState(0);

    const [DownloadLoading, setDownloadLoading] = useState(false);
    const [isChecked, setIsChecked] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [syncPhase, setSyncPhase] = useState("idle");
    const [dummydata, setDummydata] = useState(null);

    const itemsPerPage = 10;

    const navigation = useNavigation();

    const [dropdownData] = useState([

        { label: 'List Design', value: 'List' },

        { label: 'Grid Design', value: 'Grid' },
    ]);


    const [isStateVisible, setIsStateVisible] = useState(false);
    const [tempSelectedState, setTempSelectedState] = useState(null);
    const [SelectedState, setSelectedState] = useState('All');
    const [selectedStateOption, setSelectedStateOption] = useState('All');
    const [StateType, setStateType] = useState('All');


    const [StateData] = useState([
        { label: 'All', value: 'All' },
        { label: 'Andhra Pradesh', value: 'AP' },
        { label: 'Arunachal Pradesh', value: 'AR' },
        { label: 'Assam', value: 'AS' },
        { label: 'Bihar', value: 'BR' },
        { label: 'Chhattisgarh', value: 'CG' },
        { label: 'Goa', value: 'GA' },
        { label: 'Gujarat', value: 'GJ' },
        { label: 'Haryana', value: 'HR' },
        { label: 'Himachal Pradesh', value: 'HP' },
        { label: 'Jharkhand', value: 'JH' },
        { label: 'Karnataka', value: 'KA' },
        { label: 'Kerala', value: 'KL' },
        { label: 'Madhya Pradesh', value: 'MP' },
        { label: 'Maharashtra', value: 'MH' },
        { label: 'Manipur', value: 'MN' },
        { label: 'Meghalaya', value: 'ML' },
        { label: 'Mizoram', value: 'MZ' },
        { label: 'Nagaland', value: 'NL' },
        { label: 'Odisha', value: 'OD' },
        { label: 'Punjab', value: 'PB' },
        { label: 'Rajasthan', value: 'RJ' },
        { label: 'Sikkim', value: 'SK' },
        { label: 'Tamil Nadu', value: 'TN' },
        { label: 'Telangana', value: 'TS' },
        { label: 'Tripura', value: 'TR' },
        { label: 'Uttar Pradesh', value: 'UP' },
        { label: 'Uttarakhand', value: 'UK' },
        { label: 'West Bengal', value: 'WB' },
    ]);


    const [searchQuery, setSearchQuery] = useState('');

    const filteredStates = StateData.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    function formatIndianNumber(num) {
        if (!num) return "0";
        let x = num.toString();
        let lastThree = x.substring(x.length - 3);
        let otherNumbers = x.substring(0, x.length - 3);
        if (otherNumbers !== "") {
            lastThree = "," + lastThree;
        }
        return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    }

    const countVehiclesInDB = () => {
        db.transaction(tx => {
            tx.executeSql(
                'SELECT COUNT(*) AS count FROM vehicles',
                [],
                (tx, results) => {
                    const total = results.rows.item(0).count;
                    console.log("📊 DB total vehicles count:", total);
                    setTotalItems(total);  // <- THIS IS KEY
                }
            );
        });
    };

    useFocusEffect(
        useCallback(() => {
            countVehiclesInDB();
            fakedata();
        }, [])
    );

    const handleCloseModal = () => {
        setModalVisible(false); // Close the modal
    };

    const fakedata = async () => {
        try {
            const response = await fetch(ENDPOINTS.dummy_data, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                }),
            });

            const result = await response.json();
            console.log(result)
            if (result.code == 200) {
                setDummydata(result.dummay_data);
            } else {
                console.log('Error:', result.message || 'Failed to load staff data');
            }
        } catch (error) {
            console.log('Error fetching data:', error.message);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            const fetchDesign = async () => {
                try {
                    const viewType = await AsyncStorage.getItem('selected_view_type');
                    const savedState = await AsyncStorage.getItem('selected_state');
                    console.log("ViewType Ye hai bhai Setting", viewType, savedState);
                    if (viewType !== null) {
                        setSelectedOption(viewType); // Set from AsyncStorage
                        setListType(viewType);
                    }
                    if (savedState !== null) {
                        setSelectedState(savedState);
                        // ✅ Optional: set label from state value (if you store full object or match from StateData)
                        const label = StateData.find((item) => item.value === savedState)?.label;
                        if (label) setSelectedStateOption(label);
                    }
                } catch (error) {
                    console.error('Error fetching view type:', error);
                }
            };

            fetchDesign();
        }, [])
    );

    const [isDataAvailable, setIsDataAvailable] = useState(false);
    console.log("check is data Available", isDataAvailable);
    useEffect(() => {
        const checkData = async () => {
            try {
                const exists = await checkIfDataExists();
                setIsDataAvailable(exists); // ✅ Save result in state
                console.log("🚦 Data exists hai kya:", exists);
            } catch (error) {
                console.error("❌ Error checking data:", error);
            }
        };

        checkData();
    }, []);

    const checkIfDataExists = () => {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    'SELECT COUNT(*) as count FROM vehicles',
                    [],
                    (tx, results) => {
                        const count = results.rows.item(0).count;
                        resolve(count > 0); // ✅ Only true if at least 1 row exists
                    },
                    error => {
                        console.log("❌ Error checking data existence:", error.message);
                        reject(false);
                    }
                );
            });
        });
    };

    const sanitizeVehicle = (v) => ({
        id: parseInt(v.id || 0),
        month: v.month || '',
        finance_name: v.finance_name || '',
        finance_contact_person_name: v.finance_contact_person_name || '',
        finance_contact_number: v.finance_contact_number || '',
        manager: v.manager || '',
        branch: v.branch || '',
        agreement_number: v.agreement_number || '',
        app_id: v.app_id === '-' ? '' : v.app_id,
        customer_name: v.customer_name || '',
        bucket: v.bucket || '',
        emi: v.emi || '',
        principle_outstanding: v.principle_outstanding === '-' ? '' : v.principle_outstanding,
        total_outstanding: v.total_outstanding === '-' ? '' : v.total_outstanding,
        product: v.product || '',
        fild_fos: v.fild_fos || '',
        registration_number: v.registration_number || '',
        chassis_number: v.chassis_number || '',
        engine_number: v.engine_number || '',
        repo_fos: v.repo_fos === '-' ? '' : v.repo_fos,
        entry_date: v.entry_date || '',
        type: v.type || '',
        last_reg_no: v.last_reg_no,       // ✅ new field
        last_chassis_no: v.last_chassis_no,   // ✅ new field
        last_engine_no: v.last_engine_no,
        state_code: v.state_code
    });

    // Function to delete all vehicles from the table
    const deleteAllVehicles = () => {
        return new Promise((resolve, reject) => {
            db.transaction(tx => {
                tx.executeSql(
                    `DELETE FROM vehicles`,
                    [],
                    (tx, results) => {
                        console.log("✅ All old vehicle data deleted.");
                        // loadAllFromDB();
                        countVehiclesInDB();
                        resolve(); // Resolve the promise after deletion
                    },
                    (error) => {
                        console.log("❌ Error deleting vehicles: ", error);
                        reject(error); // Reject the promise if there's an error
                    }
                );
            });
        });
    };


    const loadAllVehiclesPaginated = async (alldataget) => {
        console.log("called api");

        await AsyncStorage.setItem("syncStatus", "incomplete");
        KeepAwake.activate();

        if (Platform.OS == "android") {
            await ForegroundService.start("Downloading data", "Preparing to sync…", "SettingScreen");
        }

        let offset = 1;
        let keepLoading = true;
        let totalRecordsFetched = 0;

        try {
            const userId = await AsyncStorage.getItem('staff_id');
            const userType = await AsyncStorage.getItem('user_type');
            console.log("userType ye hai", userType);

            if (!userId) {
                console.log("❌ User ID not found");
                return;
            }

            // Step 1: Check if vehicles already exist in the database
            const dataExists = await checkIfDataExists();
            console.log("Data exists in DB:", dataExists);  // Log the result here
            setLoadingDone(false);


            if (dataExists && alldataget == 'yes') {
                console.log("✅ Data already exists in the database. Skipping the API call and hiding the modal.");
                setSyncPhase("deleting");
                await deleteAllVehicles();
                // await loadAllFromDB();      // 👍 Just load data from DB

                countVehiclesInDB();
                setSyncPhase("syncing");      // Update counters
                // Stop loading animation
                // return;
            }

            const endpoint = userType === 'normal'
                ? ENDPOINTS.VehicleList_Normal
                : ENDPOINTS.VehicleList_Full;


            if (syncPhase !== "syncing") {
                setSyncPhase("syncing");
            }
            while (keepLoading) {
                const url = `${endpoint}?user_id=${userId}&offset=${offset}&alldataget=${alldataget}`;
                const response = await fetch(url);
                const result = await response.json();

                if (result.code === 200 && result.hasData !== 'nodata' && Array.isArray(result.payload)) {

                    const dataLength = result.payload.length;

                    // Log the count of records received for current offset
                    console.log(`📦 Offset ${offset} → Received ${dataLength} records`);

                    // Update progress based on our own total = 800000
                    if (result.per) {
                        const per = Math.min(result.per, 100);
                        setProgressPercent(per); // <-- this updates the progress bar
                        if (Platform.OS == "android") {
                            try {
                                await ForegroundService.updateProgress(per, `${per}% completed`);
                            } catch (e) {
                                console.log("Notif update error:", e.message);
                            }
                        }
                    }
                    // Increment the total count
                    totalRecordsFetched += dataLength;
                    console.log(`✅ Total records fetched so far: ${totalRecordsFetched}`);

                    try {
                        const cleanedList = result.payload.map(item => sanitizeVehicle(item));
                        await bulkInsertVehicles(cleanedList);
                        // setLoadedCount(prev => prev + cleanedList.length);
                        // setTotalCount(prev => prev + cleanedList.length);

                        console.log(`✅ Bulk inserted ${cleanedList.length} vehicles`);

                    } catch (bulkErr) {
                        console.log(`❌ Bulk insert failed: ${bulkErr.message}`);
                    }

                    console.log(`✅ Page ${offset} inserted`);
                    offset += 1;
                } else {
                    keepLoading = false;
                    console.log("✅ All data loaded into SQLite.");
                }
            }
        } catch (error) {
            console.log("❌ Error while loading data:", error.message);
        } finally {
            // await loadAllFromDB();
            setSyncPhase("idle");
            countVehiclesInDB();
            setLoadingDone(true); // to hide animation or progress bar
            // UserWiseExpiryApi();
            setDownloadLoading(false);
            await AsyncStorage.setItem("syncStatus", "complete");
            KeepAwake.deactivate();
            // 🔹 Stop service
            if (Platform.OS == "android") {
                try {
                    await ForegroundService.stop();
                } catch (e) {
                    console.log("Stop service error:", e.message);
                }
            }
        }
    };

    const loadAllFromDB = async () => {
        try {
            const initialVehicles = await getVehiclesPaginated(0, itemsPerPage);
            // setSearchVehicle(initialVehicles);
            setAllVehicles(initialVehicles);
            setPage(1);
        } catch (error) {
            console.log("❌ Error in paginated load from DB:", error);
        }
    };

    const renderStateItem = ({ item }) => (
        <TouchableOpacity
            style={{
                paddingVertical: 10,
                paddingHorizontal: 15,
                backgroundColor: 'white',
                flexDirection: 'row', justifyContent: 'space-between',
                borderBottomWidth: 1,
                borderColor: '#ccc'
            }}
            onPress={() => {
                setTempSelectedState(item.value);
                setSelectedStateOption(item.label);
                setIsStateVisible(false);
            }}
        >
            <Text style={{ fontSize: 16, color: 'black', fontFamily: 'Inter-Regular' }}>{item.label}</Text>

            {selectedStateOption === item.label && (
                <Entypo name="check" size={20} color="green" />
            )}
        </TouchableOpacity>
    );

    return (
        <>
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                {/* Header Section */}
                <View
                    style={{
                        backgroundColor: colors.Brown,
                        paddingVertical: 15,
                        paddingHorizontal: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <Text
                        style={{
                            color: 'white',
                            fontSize: 20,
                            fontWeight: 'bold',
                            fontFamily: 'Inter-Bold',
                        }}>
                        Setting
                    </Text>

                </View>

                <LocationAndNetworkChecker>
                    <ScrollView style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps='handled'>
                        <View style={{ width: '100%', borderBottomWidth: 1, borderColor: '#ccc', padding: 10, flexDirection: 'row' }}>
                            <View style={{ width: '40%' }}><Text style={{ color: 'black', fontFamily: 'Inter-Bold' }}>Total Vehicles</Text></View>
                            <View style={{ width: '40%' }}><Text style={{ color: 'black', fontFamily: 'Inter-Bold' }}>:</Text></View>
                            <View style={{ width: '40%' }}><Text style={{ color: 'black', fontFamily: 'Inter-Regular' }}>{formatIndianNumber(totalItems > 0 ? totalItems + dummydata : totalItems)}</Text></View>

                        </View>
                        <View>
                            <View
                                style={{
                                    backgroundColor: 'white',
                                    borderTopLeftRadius: 20,
                                    borderTopRightRadius: 20,
                                    padding: 10,
                                    paddingBottom: 20,
                                }}
                                onStartShouldSetResponder={() => true} // Prevent modal from closing on content click
                                onTouchEnd={e => e.stopPropagation()}
                            >
                                <Text style={{ fontFamily: 'Inter-Bold', marginBottom: 15, color: 'black', fontFamily: 'Inter-Bold' }}>
                                    Select Design
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
                                    <TouchableOpacity
                                        style={{ alignItems: 'center' }}
                                        onPress={() => {
                                            setSelectedImage(List);
                                            setModalVisible(true);
                                        }}
                                    >
                                        <Image source={List} style={{ width: 220, height: 300, resizeMode: 'contain' }} />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={{ alignItems: 'center' }}
                                        onPress={() => {
                                            setSelectedImage(Grid);
                                            setModalVisible(true);
                                        }}
                                    >
                                        <Image source={Grid} style={{ width: 220, height: 300, resizeMode: 'contain' }} />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
                                    {dropdownData.map((item) => (
                                        <TouchableOpacity
                                            key={item.value}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                marginVertical: 8,
                                                paddingHorizontal: 15,
                                                paddingVertical: 10,
                                                borderRadius: 8,
                                                backgroundColor: selectedOption === item.value ? '#c5e8e4' : 'transparent',

                                            }}
                                            onPress={() => {
                                                setSelectedOption(item.value);
                                                setSelectedDropdownItem(item.value);
                                            }
                                            }
                                        >
                                            <View
                                                style={{
                                                    height: 20,
                                                    width: 20,
                                                    borderRadius: 10,
                                                    borderWidth: 2,
                                                    borderColor: colors.Brown,
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    marginRight: 12,
                                                    flexDirection: 'row', borderWidth: 1
                                                }}
                                            >
                                                {selectedOption === item.value && (
                                                    <View
                                                        style={{
                                                            height: 10,
                                                            width: 10,
                                                            borderRadius: 5,
                                                            backgroundColor: colors.Brown,
                                                        }}
                                                    />
                                                )}
                                            </View>
                                            <Text style={{ fontSize: 16, fontFamily: 'Inter-Regular', color: 'black', fontFamily: 'Inter-Regular' }}>{item.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* State Selection */}
                                <View style={{ marginTop: 8, flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                                    {/* State Selection Label */}
                                    <Text style={{ fontFamily: 'Inter-Bold', marginBottom: 0, color: 'black' }} >
                                        Vehicle Series Filter:
                                    </Text>

                                    {/* Dropdown Field */}
                                    <View style={{ flex: 1 }}>
                                        <TouchableOpacity style={{ backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: '#ddd', borderWidth: 1, }}
                                            onPress={() => {
                                                setIsStateVisible(!isStateVisible);
                                                setSearchQuery('');
                                            }}
                                        >
                                            <Text style={{ fontSize: 14, color: 'black', fontFamily: 'Inter-Regular' }}>{selectedStateOption}</Text>
                                            <Ionicons
                                                name={isStateVisible ? 'chevron-up' : 'chevron-down'}
                                                size={20}
                                                color="black"
                                            />
                                        </TouchableOpacity>

                                        <Modal
                                            animationType="fade"
                                            transparent={true}
                                            visible={isStateVisible}
                                            onRequestClose={() => setIsStateVisible(false)}
                                        >
                                            <View
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'flex-end',
                                                        width: '80%',


                                                        backgroundColor: 'white'
                                                    }}>
                                                    <View style={{
                                                        width: '80%', borderBottomWidth: 1, borderColor: '#ccc', flexDirection: 'row', justifyContent: 'center', paddingVertical: 10, alignItems: 'center', borderTopLeftRadius: 10,

                                                    }}>
                                                        <Text style={{ color: 'black', fontFamily: 'Inter-regular', fontSize: 16 }}>Select State(राज्य चुनें)</Text>
                                                    </View>
                                                    <View style={{ width: '20%', borderBottomWidth: 1, borderColor: '#ccc', flexDirection: 'row', justifyContent: 'center', paddingVertical: 10, alignItems: 'center', borderTopRightRadius: 10, }}>
                                                        <TouchableOpacity
                                                            onPress={() => setIsStateVisible(false)}
                                                            style={{
                                                                marginRight: 5,
                                                                backgroundColor: 'white',
                                                                borderRadius: 50,
                                                            }}>
                                                            <Entypo name="cross" size={30} color="grey" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>

                                                {/* Search Input */}
                                                <View style={{ backgroundColor: 'white', width: '80%', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', paddingHorizontal: 10, }} >
                                                    <Feather name="search" size={20} color="#999" style={{ marginRight: 8 }} />
                                                    <TextInput
                                                        placeholder="Search"
                                                        placeholderTextColor="#999"
                                                        value={searchQuery}
                                                        onChangeText={setSearchQuery}
                                                        style={{ flex: 1, paddingVertical: 10, fontSize: 16, fontFamily: 'Inter-Regular', color: 'black', }}
                                                    />
                                                </View>
                                                <View style={{ backgroundColor: 'white', width: '80%', maxHeight: '70%', }} >
                                                    <FlatList
                                                        data={filteredStates}
                                                        showsVerticalScrollIndicator={false}
                                                        renderItem={renderStateItem}
                                                        keyExtractor={(item) => item.value}
                                                        keyboardShouldPersistTaps="handled"
                                                    />
                                                </View>
                                            </View>
                                        </Modal>
                                    </View>
                                </View>

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        marginTop: 20,
                                    }}
                                >
                                    <TouchableOpacity
                                        onPress={async () => {
                                            try {
                                                await AsyncStorage.setItem('selected_view_type', selectedOption); // Save view type
                                                // Determine the state to save (fallback to 'All')
                                                const previousState = await AsyncStorage.getItem('selected_state');

                                                // Use tempSelectedState only if user selected a new one, otherwise fallback to previous
                                                const stateToSave = tempSelectedState ?? previousState ?? 'All';

                                                await AsyncStorage.setItem('selected_state', stateToSave);

                                                // Update UI states
                                                setSelectedState(stateToSave); // Value
                                                const label = StateData.find((item) => item.value === stateToSave)?.label;
                                                if (label) setSelectedStateOption(label); // Label

                                                setListType(selectedOption); // Also update design type state
                                                ToastAndroid.show("Setting Updated Successfully", ToastAndroid.SHORT);
                                            } catch (error) {
                                                console.error('Error saving view type:', error);
                                            }
                                        }}

                                        style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.Brown, borderRadius: 8, width: '45%', justifyContent: 'center', alignItems: 'center' }}
                                    >
                                        <Text style={{ fontFamily: 'Inter-Bold', color: 'white' }}>Save</Text>
                                    </TouchableOpacity>
                                </View>

                            </View>
                            <View style={{ borderBottomWidth: 1, borderColor: '#ccc', width: '100%', }} />
                            <View style={{ width: '100%', padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ width: '40%' }}><Text style={{ color: 'black', fontFamily: 'Inter-Bold' }}>Download Vehicles</Text></View>
                                <TouchableOpacity
                                    onPress={() => {
                                        // setLoadingDone(false);
                                        // setDownloadLoading(true);
                                        // loadAllVehiclesPaginated();
                                        setShowModal(true)
                                    }}
                                    // ⛔️ Disable if data exists
                                    style={{
                                        justifyContent: 'center',
                                        flexDirection: 'row',
                                        borderColor: 'black',
                                        borderWidth: 1,
                                        borderRadius: 10,
                                        alignItems: 'center',
                                        width: '50%',
                                        padding: 8,
                                        backgroundColor: colors.Brown,
                                        gap: 5
                                    }}
                                >
                                    {DownloadLoading ? (
                                        <ActivityIndicator size="small" color="black" style={{ marginRight: 10 }} />
                                    ) : (
                                        <MaterialIcons name="download" size={22} color="#fff" />
                                    )}
                                    <Text style={{ color: '#fff', fontFamily: 'Inter-Light' }}>
                                        {DownloadLoading ? 'Downloading...' : 'Download '}
                                    </Text>
                                </TouchableOpacity>

                            </View>
                        </View>
                    </ScrollView>

                    <Modal
                        transparent={true}
                        visible={modalVisible}
                        animationType="fade"
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            }}
                            onPress={() => setModalVisible(false)}
                            activeOpacity={1}
                        >
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'flex-end',
                                    width: '95%',
                                    paddingVertical: 5,
                                }}>
                                <TouchableOpacity
                                    onPress={() => setModalVisible(false)}
                                    style={{
                                        marginRight: 10,
                                        backgroundColor: 'white',
                                        borderRadius: 50,
                                    }}>
                                    <Entypo name="cross" size={25} color="black" />
                                </TouchableOpacity>
                            </View>
                            <View
                                style={{
                                    width: '90%',
                                    height: '80%',
                                    backgroundColor: 'white',
                                    borderRadius: 20,
                                    overflow: 'hidden',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                                onStartShouldSetResponder={() => true}
                                onTouchEnd={e => e.stopPropagation()}
                            >
                                {selectedImage && (
                                    <Image
                                        source={selectedImage}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            resizeMode: 'contain',
                                        }}
                                    />
                                )}
                            </View>
                        </TouchableOpacity>
                    </Modal>


                    {!loadingDone && (
                        <Modal visible transparent animationType="fade">
                            <View style={{
                                flex: 1, justifyContent: 'center', alignItems: 'center',
                                backgroundColor: '#00000070'
                            }}>
                                <View style={{
                                    width: 320, height: 150, backgroundColor: 'white',
                                    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
                                    shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
                                    shadowOpacity: 0.25, shadowRadius: 3.5, elevation: 5,
                                    padding: 20,
                                }}>
                                    {/* <LottieView
                    source={LoadingAnimation}
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }}
                  /> */}
                                    <Text style={{
                                        marginTop: 10, fontFamily: 'Inter-Bold', color: 'black',
                                        fontSize: 18, textAlign: 'center',
                                    }}>
                                        {syncPhase === "deleting"
                                            ? "Please wait we are reseting data..."
                                            : "Downloading Data..."}
                                    </Text>

                                    {syncPhase === "syncing" && (
                                        <>
                                            <Progress.Bar
                                                progress={progressPercent / 100} // 0.0 to 1.0
                                                width={280}
                                                height={10}
                                                borderRadius={5}
                                                color="#1fc091"
                                                style={{ marginTop: 15 }}
                                            />

                                            <Text style={{
                                                marginTop: 5,
                                                fontSize: 16,
                                                fontWeight: 'bold',
                                                color: '#333'
                                            }}>
                                                {progressPercent}% Completed
                                            </Text>
                                        </>
                                    )}
                                    {/* <TouchableOpacity
                    style={{
                      marginTop: 15,
                      marginBottom: 15,
                      backgroundColor: '#1fc091',
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 8
                    }}
                    onPress={async () => {
                      setLoadingDone(true); // Modal ko hide mat karo, just task ko run karo
                      setStatusVisible(true);
                      // if (!BackgroundService.isRunning()) {
                      //   await BackgroundService.start(vehicleSyncTask, options);
                      //   console.log("✅ Background task started");
                      // }
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold', fontFamily: 'Inter-Regular' }}>Run in Background</Text>
                  </TouchableOpacity> */}

                                </View>


                            </View>
                        </Modal>
                    )}

                    {/* Modal */}
                    <Modal
                        visible={showModal}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowModal(false)}
                    >
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: "rgba(0,0,0,0.5)",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <View
                                style={{
                                    backgroundColor: "#fff",
                                    padding: 20,
                                    borderRadius: 12,
                                    width: "80%",
                                }}
                            >
                                {/* Checkbox */}
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
                                    <Checkbox
                                        status={isChecked ? "checked" : "unchecked"}   // ✅ correct way
                                        onPress={() => setIsChecked(!isChecked)}       // ✅ toggles state
                                        color="#022e29"
                                    />
                                    <Text style={{ fontFamily: 'Inter-Regular', color: '#000' }}>Reset and Sync All Data</Text>
                                </View>

                                {/* Buttons */}
                                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                    <TouchableOpacity
                                        onPress={() => setShowModal(false)}
                                        style={{
                                            padding: 10,
                                            backgroundColor: "#ccc",
                                            borderRadius: 8,
                                            width: "45%",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Text style={{ fontFamily: 'Inter-Medium', color: '#000' }}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => {
                                            setShowModal(false);
                                            setDownloadLoading(true);
                                            setLoadingDone(false);
                                            loadAllVehiclesPaginated(isChecked ? "yes" : "no");
                                        }}
                                        style={{
                                            padding: 10,
                                            backgroundColor: colors.Brown,
                                            borderRadius: 8,
                                            width: "45%",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Text style={{ color: "#fff", fontFamily: 'Inter-Medium' }}>Sync</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <View style={{ justifyContent: 'flex-end' }}>
                        <Bottomtab />
                    </View>
                </LocationAndNetworkChecker>
            </View>
        </>
    )
}

export default SettingScreen

const styles = StyleSheet.create({})