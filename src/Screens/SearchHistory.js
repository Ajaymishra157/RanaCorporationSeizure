import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  Image
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { ENDPOINTS } from '../CommonFiles/Constant';
import { useNavigation } from '@react-navigation/native';
import colors from '../CommonFiles/Colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Entypo from 'react-native-vector-icons/Entypo';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Icon from 'react-native-vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EvilIcons from 'react-native-vector-icons/EvilIcons'
import MapView, { Marker } from 'react-native-maps';
import Geocoder from 'react-native-geocoding';

Geocoder.init('AIzaSyA_ksjOCGFxVCnhjJ1Zj4BBhJIaD4nlpfM');


const SearchHistory = () => {
  const navigation = useNavigation();
  const History = require('../assets/images/history.png');
  const [SearchHistory, setSearchHistory] = useState([]);
  const [SearchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  console.log("location", location);

  const [originalSearchHistory, setOriginalSearchHistory] = useState([]);

  const [loadingMore, setLoadingMore] = useState(false); // Loading state for pagination
  const [page, setPage] = useState(1); // Page number for pagination
  const itemsPerPage = 20; // Number of items to load per page

  const [totalItems, setTotalItems] = useState(0);


  const [modalVisible, setModalVisible] = useState(false);
  const [ModalFilter, setModalFilter] = useState(false);

  const [selectedHistory, setSelectedHistory] = useState(null);
  const [text, setText] = useState(null);
  const [MapLoading, setMapLoading] = useState(true);

  const filters = ['Today', 'Yesterday', 'Month', 'custom'];

  const [selectedFilter, setSelectedFilter] = useState('Today'); // Selected filter state
  console.log('selected filter ye hai', selectedFilter);
  const [isFilterActive, setIsFilterActive] = useState(false);

  const [Customodal, setCustomodal] = useState(false);
  const [isValidFromDate, setIsValidFromDate] = useState(true);
  const [isValidTillDate, setIsValidTillDate] = useState(true);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showTillDatePicker, setShowTillDatePicker] = useState(false);

  const getFormattedCurrentDate = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1; // Months are zero-indexed
    const year = today.getFullYear();
    return `${year}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day
      }`;
  };

  useEffect(() => {
    if (selectedHistory && selectedHistory.vehicle_location) {
      console.log('Vehicle Location:', selectedHistory.vehicle_location);
      setMapLoading(true); // API call se pehle loading ko true karo
      setLocation(null); // Purani location ko clear karo

      Geocoder.from(selectedHistory.vehicle_location)
        .then(json => {
          console.log('Geocoder Response:', json);
          if (json.results.length > 0) {
            const location = json.results[0].geometry.location;
            console.log('Parsed Location:', location);
            setLocation(location);
          } else {
            console.warn('No results found for the location.');
            setLocation(null); // Location nahi mila to null set karo
          }
        })
        .catch(error => {
          console.warn('Geocoding Error:', error);
          setLocation(null); // Error par bhi null set karo
        })
        .finally(() => {
          setMapLoading(false); // API call ke baad loading ko false karo
        });
    } else {
      setMapLoading(false); // Agar selectedHistory nahi hai to loading false karo
      setLocation(null); // Purani location ko clear karo
    }
  }, [selectedHistory]);

  useEffect(() => {
    if (location || !selectedHistory) {
      setMapLoading(false); // Jab location mile ya selectedHistory null ho to loading false karo
    }
  }, [location, selectedHistory]);





  const [fromDate, setFromDate] = useState(getFormattedCurrentDate());
  const [tillDate, setTillDate] = useState(getFormattedCurrentDate());

  // Get formatted yesterday's date
  const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // Subtract one day
    const day = yesterday.getDate();
    const month = yesterday.getMonth() + 1;
    const year = yesterday.getFullYear();
    return `${year}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day
      }`;
  };

  // Get the first date of the current month
  const getFirstDateOfCurrentMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    return `${year}-${month < 10 ? `0${month}` : month}-01`;
  };

  const openModal2 = () => {
    setModalFilter(true);
  };

  const closeModal2 = () => {
    setModalFilter(false);
  };

  const handleFilterPress = filter => {
    setSelectedFilter(filter); // Update selected filter
    setIsFilterActive(filter !== '');

    let updatedFromDate = '';
    let updatedTillDate = '';

    // Handle date range based on selected filter
    if (filter === 'Today') {
      updatedFromDate = getFormattedCurrentDate();
      updatedTillDate = getFormattedCurrentDate();
    } else if (filter === 'Yesterday') {
      updatedFromDate = getYesterdayDate();
      updatedTillDate = getYesterdayDate();
    } else if (filter === 'Month') {
      updatedFromDate = getFirstDateOfCurrentMonth();
      updatedTillDate = getFormattedCurrentDate();
    } else if (filter === 'custom') {
      setCustomodal(true);
      setIsValidFromDate(true);
      setIsValidTillDate(true);
      setFromDate('');
      setTillDate('');
    }

    // Log the selected filter and date values for debugging
    console.log('Selected filter xxxx:', filter);
    console.log('From Date: yyyyy', updatedFromDate);
    console.log('Till Date: zzzz', updatedTillDate);

    if (filter !== 'custom') {
      setFromDate(updatedFromDate);
      setTillDate(updatedTillDate);
      SearchHistoryApi(updatedFromDate, updatedTillDate);
    }

    closeModal2();
  };

  useEffect(() => {
    if (fromDate && tillDate) {
      SearchHistoryApi(fromDate, tillDate);
    }
  }, [fromDate, tillDate]);

  const handleSubmit = () => {
    const isFromDateValid = fromDate !== '';
    const isTillDateValid = tillDate !== '';

    // Set validation states
    setIsValidFromDate(isFromDateValid);
    setIsValidTillDate(isTillDateValid);

    // Check if both dates are valid
    if (!isFromDateValid || !isTillDateValid) {
      // If either fromDate or tillDate is invalid, show the validation error
      if (!isFromDateValid) {
      }
      if (!isTillDateValid) {
      }
      return; // Prevent form submission if validation fails
    }

    // If both dates are valid, proceed with the API call
    setCustomodal(false); // Close modal after submitting
    SearchHistoryApi(fromDate, tillDate);
  };

  const loadMoreData = () => {
    if (loadingMore || SearchHistory.length >= totalItems) return;
    setLoadingMore(true);

    // Simulate API call or fetching more data
    setTimeout(() => {
      const nextData = SearchHistory.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
      setData((prevData) => [...prevData, ...nextData]);
      setPage(page + 1); // Increment the page number for next batch
      setLoadingMore(false);
    }, 1000); // Simulate network delay
  };

  // Load the first batch of data
  useEffect(() => {
    loadMoreData();
  }, []);

  const openModal = item => {
    setSelectedHistory(item); // Set selected item data to show in the modal
    setModalVisible(true); // Show the modal
  };

  const closeModal = () => {
    setModalVisible(false); // Hide the modal
    setSelectedHistory(null); // Clear the selected item data
  };

  const formattedDate = dateString => {
    const date = new Date(dateString); // Convert the string to a Date object
    const day = String(date.getDate()).padStart(2, '0'); // Get the day and ensure it's 2 digits
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Get the month (0-indexed, so add 1) and ensure it's 2 digits
    const year = date.getFullYear(); // Get the year

    return `${day}-${month}-${year}`; // Return the formatted date as "DD-MM-YYYY"
  };

  const formatDate = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Adding leading zero
    const day = String(date.getDate()).padStart(2, '0'); // Adding leading zero
    return `${year}-${month}-${day}`; // New format: "YYYY-MM-DD"
  };

  const handleDateChange = (event, selectedDate, type) => {
    if (event.type === 'dismissed') {
      if (type === 'from') {
        setShowFromDatePicker(false); // Close From Date picker if cancelled
      } else {
        setShowTillDatePicker(false); // Close Till Date picker if cancelled
      }
      return;
    }
    // If selectedDate is null (meaning the user cancelled), don't update the date
    if (!selectedDate) {
      return;
    }

    const currentDate = selectedDate || new Date(); // Default to the selected date or current date
    if (type === 'from') {
      setFromDate(formatDate(currentDate)); // Set formatted 'from' date
    } else {
      setTillDate(formatDate(currentDate)); // Set formatted 'till' date
    }

    // Close the date picker after selecting the date
    if (type === 'from') {
      setShowFromDatePicker(false);
    } else {
      setShowTillDatePicker(false);
    }
  };

  const SearchHistoryApi = async (fromdate, tilldate) => {
    setSearchLoading(true);
    console.log('from date and till date', fromdate, tilldate);
    try {
      const staffId = await AsyncStorage.getItem('staff_id');

      if (!staffId) {
        console.log('Error: Staff ID is not found in AsyncStorage');
        setSearchLoading(false);
        return;
      }
      const response = await fetch(ENDPOINTS.Search_History, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // staff_id: fromdate && tilldate ? staffId : 'All',
          from_date: fromdate,
          till_date: tilldate,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.code === 200) {
          setSearchHistory(result.payload); // Successfully received data
          setOriginalSearchHistory(result.payload);
        } else {
          console.log('Error:', 'Failed to load staff data');
          setSearchHistory([]);
        }
      } else {
        console.log('HTTP Error:', result.message || 'Something went wrong');
      }
    } catch (error) {
      console.log('Error fetching data:', error.message);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    SearchHistoryApi(fromDate, tillDate);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setIsFilterActive(false);
    setSelectedFilter('Today');
    const today = getFormattedCurrentDate();

    // Set both from and till date to today
    setFromDate(today);
    setTillDate(today);

    await SearchHistoryApi(today, today);
    setRefreshing(false);
  };

  // Store the filtered data based on search

  // Function to handle text change in the search input
  const handleTextChange = (inputText) => {
    setText(inputText);

    // If inputText is empty, show the original data
    if (inputText === '') {
      setSearchHistory(originalSearchHistory);  // Reset to original data
    } else {
      // Filter data based on Name, Reg No, or Agg No
      const filtered = originalSearchHistory.filter(item => {
        const lowerCaseInput = inputText.toLowerCase();
        return (
          item.history_staff_name.toLowerCase().includes(lowerCaseInput) ||
          item.vehicle_registration_no.toLowerCase().includes(lowerCaseInput) ||
          item.vehicle_agreement_no.toLowerCase().includes(lowerCaseInput)
        );
      });

      setSearchHistory(filtered); // Update filtered data state
    }
  };


  const renderItem = ({ item, index }) => (
    <View
      key={item.history_id}
      style={{
        marginTop: 10,
        backgroundColor: '#fff',
        padding: 5,
        marginBottom: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.Brown,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 2,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: '#333',
            fontFamily: 'Inter-Regular',
          }}
        >
          #{index + 1}
        </Text>
        <TouchableOpacity
          onPress={() => openModal(item)}
          style={{
            padding: 5,
            borderRadius: 50,
            backgroundColor: '#f0f0f0',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <AntDesign name="infocirlceo" size={20} color="black" />
        </TouchableOpacity>
      </View>

      {/* Use flexWrap: 'wrap' to ensure content wraps to the next line if it overflows */}
      <View style={{ flexDirection: 'row', marginBottom: 5 }}>
        <View style={{ width: '50%', flexDirection: 'row', flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 12, color: '#888', fontFamily: 'Inter-Regular' }}>Name</Text>
          <Text style={{ fontSize: 12, color: '#333', fontFamily: 'Inter-Regular' }}> : </Text>
          <Text
            style={{
              fontSize: 12,
              color: '#333',
              fontFamily: 'Inter-Regular',
              flexWrap: 'wrap', // Allow wrapping of long text
            }}
          >
            {item.history_staff_name || '----'}
          </Text>
        </View>

        <View style={{ width: '50%', flexDirection: 'row', flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 12, color: '#888', fontFamily: 'Inter-Regular' }}>Reg No</Text>
          <Text style={{ fontSize: 12, color: '#333', fontFamily: 'Inter-Regular' }}> : </Text>
          <Text
            style={{
              fontSize: 12,
              color: '#333',
              fontFamily: 'Inter-Regular',
              flexWrap: 'wrap', // Allow wrapping of long text
            }}
          >
            {item.vehicle_registration_no || '----'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
        <View style={{ width: '50%', flexDirection: 'row', flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 12, color: '#888', fontFamily: 'Inter-Regular' }}>Agg No</Text>
          <Text style={{ fontSize: 12, color: '#333', fontFamily: 'Inter-Regular' }}> : </Text>
          <Text
            style={{
              fontSize: 12,
              color: '#333',
              fontFamily: 'Inter-Regular',
              flexWrap: 'wrap', // Allow wrapping of long text
            }}
          >
            {item.vehicle_agreement_no || '----'}
          </Text>
        </View>

        <View style={{ width: '50%', flexDirection: 'row', flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 12, color: '#888', fontFamily: 'Inter-Regular' }}>Date</Text>
          <Text style={{ fontSize: 12, color: '#333', fontFamily: 'Inter-Regular' }}> : </Text>
          <Text
            style={{
              fontSize: 12,
              color: '#333',
              fontFamily: 'Inter-Regular',
              flexWrap: 'wrap', // Allow wrapping of long text
            }}
          >
            {item.entry_date || '----'}
          </Text>
        </View>
      </View>


      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
        <View style={{ width: '80%', flexDirection: 'row' }}>
          <Text style={{ fontSize: 12, color: '#888', fontFamily: 'Inter-Regular' }}>Location</Text>
          <Text style={{ fontSize: 12, color: '#333', fontFamily: 'Inter-Regular' }}> : </Text>
          <Text
            style={{
              fontSize: 12,
              color: '#333',
              fontFamily: 'Inter-Regular',
              flexWrap: 'wrap', // Allow wrapping of long text
            }}
          >
            {item.vehicle_location || '----'}
          </Text>
        </View>
      </View>
    </View>
  );



  return (
    <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.Brown,
          paddingVertical: 15,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 15,
            left: 15,
            width: '13%',
            height: 40,
          }}
          onPress={() => {
            navigation.goBack();
          }}>
          <Ionicons name="arrow-back" color="white" size={26} />
        </TouchableOpacity>

        <Text
          style={{
            color: 'white',
            fontSize: 20,
            fontWeight: 'bold',
            fontFamily: 'Inter-Bold',
          }}>
          Search History
        </Text>

        <View
          style={{
            width: '15%',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            right: 6,
            top: 16,

          }}>
          {isFilterActive && (
            <View
              style={{
                position: 'absolute',
                right: 11,
                top: 0,

                width: 8,
                height: 8,
                borderRadius: 5,
                backgroundColor: 'white',
              }}
            />
          )}
          <TouchableOpacity onPress={openModal2}>
            <AntDesign name="filter" size={25} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ width: '100%', paddingHorizontal: 10 }}>
        <View
          style={{
            width: '100%',

            borderWidth: 1,
            borderColor: colors.Brown,
            marginTop: 5,
            borderRadius: 8,
            height: 50,
            backgroundColor: 'white',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderColor: colors.Brown,

          }}>
          <EvilIcons name='search' size={28} color='black' />
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              fontFamily: 'Inter-Regular',

              color: 'black',
              height: 50,
            }}

            placeholder="Search Name/Vehno/Aggno"
            placeholderTextColor="grey"
            value={text}
            onChangeText={handleTextChange}
          />
          {text ? (
            <TouchableOpacity
              onPress={() => {

                setText(''); // Clear the search text
                setSearchHistory(originalSearchHistory);
              }}
              style={{
                marginRight: 7,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Entypo name="cross" size={20} color="black" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B4513', '#8B4513']}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 10 }}>
        {/* Loading Indicator */}
        {SearchLoading ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 30,
            }}>
            <ActivityIndicator size="large" color={colors.Brown} />
          </View>
        ) : SearchHistory.length === 0 ? (
          <View style={{ height: 600, justifyContent: 'center', alignItems: 'center' }}>
            <Image source={History} style={{ width: 70, height: 70 }} />
            <Text style={{ fontFamily: 'Inter-Regular', color: 'red', marginTop: 10 }}>
              No Search History Found
            </Text>
          </View>
        ) : (
          <FlatList

            data={SearchHistory} // The list data
            keyExtractor={(item) => item.history_id.toString()} // Unique key for each item
            renderItem={renderItem} // Function to render each row
            onEndReached={loadMoreData} // Trigger loading more data when scrolled to the bottom
            onEndReachedThreshold={0.5} // Trigger when the user reaches 50% from the end
            keyboardShouldPersistTaps="handled"
          />
        )}
      </ScrollView>
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <TouchableOpacity
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dimmed background
          }}
          activeOpacity={1}
          onPress={closeModal}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              width: '85%',
              paddingVertical: 5,
            }}>
            <TouchableOpacity
              onPress={closeModal}
              style={{
                marginRight: 5,
                backgroundColor: 'white',
                borderRadius: 50,
              }}>
              <Entypo name="cross" size={25} color="black" />
            </TouchableOpacity>
          </View>
          <View
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 15,
              width: '85%',
              maxHeight: '80%', // Ensure modal does not overflow
            }}
            onStartShouldSetResponder={() => true} // Prevent modal from closing on content click
            onTouchEnd={e => e.stopPropagation()}>
            {selectedHistory && (
              <>
                {/* <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 5,
                    top: 12,
                    width: '20%',
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                  onPress={closeModal}>
                  <Entypo name="cross" size={30} color="black" />
                </TouchableOpacity> */}

                <View
                  style={{
                    width: '100%',
                    justifyContent: 'center',

                    flexDirection: 'row',

                  }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontFamily: 'Inter-Medium',
                      marginBottom: 20,
                      color: 'black',
                      textAlign: 'center',
                    }}>
                    Search History Details
                  </Text>
                  {/* <TouchableOpacity onPress={closeModal} style={{ padding: 2, position: 'absolute', top: -10, right: -10 }}>


                    <Entypo name='cross' color='black' size={25} />
                  </TouchableOpacity> */}
                </View>
                <View style={{ borderWidth: 1, borderColor: '#ddd', width: '100%' }} />

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  <Text
                    style={{
                      fontSize: 14,
                      marginBottom: 10,
                      fontFamily: 'Inter-Regular',
                      color: 'black',
                      marginTop: 5
                    }}>
                    <Text
                      style={{
                        fontWeight: 'bold',
                        color: '#333',
                        fontFamily: 'Inter-Medium',
                      }}>
                      Staff Name:{' '}
                    </Text>
                    {selectedHistory.history_staff_name}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      marginBottom: 10,
                      fontFamily: 'Inter-Regular',
                      color: 'black',
                    }}>
                    <Text
                      style={{
                        fontWeight: 'bold',
                        color: '#333',
                        fontFamily: 'Inter-Medium',
                      }}>
                      Staff Mobile:{' '}
                    </Text>
                    {selectedHistory.history_staff_mobile}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      marginBottom: 10,
                      fontFamily: 'Inter-Regular',
                      color: 'black',
                    }}>
                    <Text
                      style={{
                        fontWeight: 'bold',
                        color: '#333',
                        fontFamily: 'Inter-Medium',
                      }}>
                      Vehicle Loan No:{' '}
                    </Text>
                    {selectedHistory.vehicle_agreement_no}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      marginBottom: 10,
                      fontFamily: 'Inter-Regular',
                      color: 'black',
                    }}>
                    <Text
                      style={{
                        fontWeight: 'bold',
                        color: '#333',
                        fontFamily: 'Inter-Medium',
                      }}>
                      Vehicle Registration No:{' '}
                    </Text>
                    {selectedHistory.vehicle_registration_no}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      marginBottom: 10,
                      fontFamily: 'Inter-Regular',
                      color: 'black',
                    }}>
                    <Text
                      style={{
                        fontWeight: 'bold',
                        color: '#333',
                        fontFamily: 'Inter-Medium',
                      }}>
                      Entry Date:{' '}
                    </Text>
                    {selectedHistory.entry_date}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      marginBottom: 10,
                      fontFamily: 'Inter-Regular',
                      color: 'black',
                    }}>
                    <Text
                      style={{
                        fontWeight: 'bold',
                        color: '#333',
                        fontFamily: 'Inter-Medium',
                      }}>
                      Vehicle Location:{' '}
                    </Text>
                    {selectedHistory.vehicle_location}
                  </Text>

                </ScrollView>

              </>
            )}

            {MapLoading ? (
              <ActivityIndicator size="large" color={colors.Brown} />
            ) : location ? (
              <MapView
                style={{ width: '100%', height: 200 }}
                region={{
                  latitude: location.lat,
                  longitude: location.lng,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: location.lat,
                    longitude: location.lng,
                  }}
                  title={selectedHistory?.vehicle_location || 'Location'}
                />
              </MapView>
            ) : (
              <Text style={{ fontSize: 16, color: 'red', textAlign: 'center', fontFamily: 'Inter-Regular' }}>
                No Location Found
              </Text>
            )}


          </View>
        </TouchableOpacity>
      </Modal>
      {/* filter modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ModalFilter}
        onRequestClose={closeModal2}>
        <TouchableWithoutFeedback onPress={closeModal2}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                width: '100%',
                paddingVertical: 5,
              }}>
              <TouchableOpacity
                onPress={closeModal2}
                style={{
                  marginRight: 10,
                  backgroundColor: 'white',
                  borderRadius: 50,
                }}>
                <Entypo name="cross" size={25} color="black" />
              </TouchableOpacity>
            </View>
            <View
              onStartShouldSetResponder={e => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                width: '100%',
                paddingBottom: 40,
              }}>
              <Text
                style={{
                  color: 'black',
                  fontFamily: 'Inter-Medium',
                  fontSize: 18,
                  marginBottom: 10,
                  textAlign: 'left',
                }}>
                Change Date
              </Text>
              {filters.map((filter, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    backgroundColor:
                      selectedFilter === filter ? colors.LightGrey : 'white',
                    padding: 10,
                    width: '100%',
                    borderBottomWidth: 1,
                    borderBottomColor: '#ccc',
                    borderRadius: 5,
                  }}
                  onPress={() => handleFilterPress(filter)}>
                  <Text
                    style={{
                      color: selectedFilter === filter ? 'black' : 'black',
                      fontFamily: 'Inter-Regular',
                      fontSize: 16,
                    }}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* custom modal */}

      <Modal visible={Customodal} animationType="slide" transparent={true}>
        <TouchableOpacity
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          onPress={() => {
            setCustomodal(false);
          }}
          activeOpacity={1}>
          <View
            style={{
              width: '80%',
              padding: 20,
              backgroundColor: 'white',
              borderRadius: 10,
              alignItems: 'center',
            }}
            onStartShouldSetResponder={() => true} // Prevent modal from closing on content click
            onTouchEnd={e => e.stopPropagation()}>
            <View
              style={{
                justifyContent: 'flex-end',
                flexDirection: 'row',
                width: '100%',
              }}>
              <TouchableOpacity
                onPress={() => {
                  setCustomodal(false);
                }}>
                <Entypo name="cross" size={24} color="Black" />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 20,
                fontFamily: 'Inter-Medium',
              }}>
              Custom History
            </Text>

            {/* From and Till Date in a row */}
            <View
              style={{
                marginTop: 15,
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 15,
              }}>
              {/* From Date */}
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    marginBottom: 5,
                    color: 'black',
                    fontFamily: 'Inter-Medium',
                  }}>
                  From Date
                </Text>
                <TouchableOpacity
                  style={{
                    padding: 10,
                    backgroundColor: '#ffffff',
                    borderRadius: 5,
                    borderWidth: 1,
                    borderColor: !isValidFromDate ? 'red' : '#cccccc',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => setShowFromDatePicker(true)}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: '#333',
                      fontFamily: 'Inter-Regular',
                    }}>
                    {fromDate ? formattedDate(fromDate) : 'Select From Date'}
                  </Text>

                  <FontAwesome name="calendar" size={20} />
                </TouchableOpacity>
                {!isValidFromDate && (
                  <Text
                    style={{
                      color: 'red',
                      fontSize: 12,
                      fontFamily: 'Inter-Regular',
                    }}>
                    From Date is required
                  </Text>
                )}
              </View>

              {/* Till Date */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    marginBottom: 5,
                    color: 'black',
                    fontFamily: 'Inter-Medium',
                  }}>
                  Till Date
                </Text>
                <TouchableOpacity
                  style={{
                    padding: 10,
                    backgroundColor: '#ffffff',
                    borderRadius: 5,
                    borderWidth: 1,
                    borderColor: !isValidTillDate ? 'red' : '#cccccc',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => setShowTillDatePicker(true)}>
                  <Text
                    style={{
                      fontSize: 10,
                      color: '#333',
                      fontFamily: 'Inter-Regular',
                    }}>
                    {tillDate ? formattedDate(tillDate) : 'Select Till Date'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowTillDatePicker(true)}>
                    <FontAwesome name="calendar" size={20} />
                  </TouchableOpacity>
                </TouchableOpacity>
                {!isValidTillDate && (
                  <Text
                    style={{
                      color: 'red',
                      fontSize: 12,
                      fontFamily: 'Inter-Regular',
                    }}>
                    Till Date is required
                  </Text>
                )}
              </View>
            </View>

            {/* Show Date Pickers */}
            {showFromDatePicker && (
              <DateTimePicker
                value={
                  fromDate
                    ? new Date(fromDate.split('/').reverse().join('-'))
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={(event, selectedDate) =>
                  handleDateChange(event, selectedDate, 'from')
                }
                minimumDate={new Date('1900-01-01')} // Allow dates from 1900 or earlier, adjust as per requirement
                maximumDate={new Date()} // Restrict future dates
              />
            )}

            {showTillDatePicker && (
              <DateTimePicker
                value={
                  tillDate
                    ? new Date(tillDate.split('/').reverse().join('-'))
                    : new Date()
                }
                mode="date"
                display="default"
                onChange={(event, selectedDate) =>
                  handleDateChange(event, selectedDate, 'till')
                }
                minimumDate={
                  fromDate
                    ? new Date(fromDate.split('/').reverse().join('-'))
                    : new Date()
                } // Set minimumDate to From Date
                maximumDate={new Date()}
              />
            )}

            {/* Action Buttons */}
            <View
              style={{
                flexDirection: 'row',
                marginTop: 20,
              }}>
              <TouchableOpacity
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  backgroundColor: colors.Brown,
                  borderRadius: 5,
                }}
                onPress={handleSubmit}>
                <Text
                  style={{
                    fontSize: 16,
                    color: 'white',
                    fontFamily: 'Inter-Regular',
                  }}>
                  View
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default SearchHistory;

const styles = StyleSheet.create({});
