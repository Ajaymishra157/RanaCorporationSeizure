import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import LoadingAnimation from '../assets/animations/Loading.json'
import colors from '../CommonFiles/Colors';
import { useNavigation } from '@react-navigation/native';
import Entypo from 'react-native-vector-icons/Entypo';
import { ENDPOINTS } from '../CommonFiles/Constant';
import Bottomtab from '../Component/Bottomtab';

const AboutScreen = () => {
    const [icardUrl, setIcardUrl] = useState(null);


    useEffect(() => {
        const fetchIcardUrl = async () => {
            const userId = await AsyncStorage.getItem('staff_id');  // Get user_id from AsyncStorage
            console.log("User ID Found:", userId);

            if (!userId) {
                console.log("❌ User ID not found");
                return;
            }

            // Construct the URL with both user_id and type
            const url = 'https://ranacorporation.webmastersinfotech.com/about.php';
            setIcardUrl(url);  // Set the constructed URL for the WebView
        };

        fetchIcardUrl();
    }, []);

    if (!icardUrl) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                {/* Lottie Animation instead of ActivityIndicator */}
                <LottieView
                    source={LoadingAnimation}  // Path to your Lottie animation file
                    autoPlay
                    loop
                    style={{ width: 200, height: 200 }}  // Customize the size as needed
                />
            </View> // Show a loading message while the URL is being set
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            {/* Header */}
            <View style={{ backgroundColor: colors.Brown, padding: 15, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', fontFamily: 'Inter-Bold' }}>
                    About Us
                </Text>
            </View>

            {/* WebView */}
            <View style={{ flex: 1 }}>
                <WebView source={{ uri: icardUrl }} style={{ flex: 1 }} />
            </View>

            {/* Bottom tab (not absolutely positioned) */}
            <Bottomtab />
        </SafeAreaView>
    );
};

export default AboutScreen

